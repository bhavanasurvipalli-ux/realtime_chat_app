const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');

// Track connected users: userId -> Set of socketIds
const activeUsers = new Map();

function setupSocketIO(io) {
  // Authentication Middleware for incoming socket connections
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'chitchat_fallback_secret_key'
      );

      let user = null;
      if (global.isUsingInMemoryDB) {
        user = global.inMemoryStore.users.find(
          (u) => u._id.toString() === decoded.id.toString()
        );
      } else {
        user = await User.findById(decoded.id).select('-password');
      }

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role || 'Member'
      };

      next();
    } catch (err) {
      console.error('Socket auth failed:', err.message);
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id;
    console.log(`\x1b[35m[Socket Connected]\x1b[0m ${socket.user.username} (${socket.id})`);

    // Add socket ID to user's set
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socket.id);

    // Update user status to online in DB
    try {
      if (global.isUsingInMemoryDB) {
        const u = global.inMemoryStore.users.find(
          (usr) => usr._id.toString() === userId
        );
        if (u) {
          u.isOnline = true;
          u.lastSeen = new Date();
        }
      } else {
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date()
        });
      }
    } catch (err) {
      console.warn('Error updating online state:', err.message);
    }

    // Broadcast user online event to everyone
    io.emit('user_online', {
      userId,
      username: socket.user.username,
      avatar: socket.user.avatar,
      isOnline: true
    });

    // Send currently online user IDs to the connected client
    const onlineIds = Array.from(activeUsers.keys());
    socket.emit('online_users_list', onlineIds);

    // Automatically join default community rooms if group
    if (global.isUsingInMemoryDB) {
      global.inMemoryStore.rooms.forEach((r) => {
        if (r.type === 'group') {
          socket.join(r._id.toString());
        }
      });
    }

    // EVENT: Join specific room / conversation
    socket.on('join_room', ({ roomId }) => {
      if (!roomId) return;
      socket.join(roomId);
      console.log(`Socket ${socket.user.username} joined room: ${roomId}`);
      socket.emit('room_joined', { roomId });
    });

    // EVENT: Leave room
    socket.on('leave_room', ({ roomId }) => {
      if (!roomId) return;
      socket.leave(roomId);
      console.log(`Socket ${socket.user.username} left room: ${roomId}`);
    });

    // EVENT: Typing Indicator Started
    socket.on('typing_start', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('typing_start', {
        roomId,
        user: {
          _id: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar
        }
      });
    });

    // EVENT: Typing Indicator Stopped
    socket.on('typing_stop', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('typing_stop', {
        roomId,
        user: {
          _id: socket.user._id,
          username: socket.user.username
        }
      });
    });

    // EVENT: Live Message
    socket.on('send_message', async ({ roomId, text, messageType = 'text', attachment = null }, callback) => {
      try {
        if (!roomId || (!text && !attachment?.url)) {
          if (callback) callback({ success: false, error: 'Empty message or missing room' });
          return;
        }

        let savedMessage;

        if (global.isUsingInMemoryDB) {
          savedMessage = {
            _id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            sender: {
              _id: socket.user._id,
              username: socket.user.username,
              avatar: socket.user.avatar,
              role: socket.user.role || 'Member'
            },
            room: roomId,
            text: text || '',
            messageType,
            attachment: attachment || { url: '', name: '', size: 0 },
            readBy: [{ user: socket.user._id, readAt: new Date() }],
            createdAt: new Date()
          };

          global.inMemoryStore.messages.push(savedMessage);

          // Update room updatedAt
          const roomObj = global.inMemoryStore.rooms.find(
            (r) => r._id.toString() === roomId.toString()
          );
          if (roomObj) roomObj.updatedAt = new Date();
        } else {
          // MongoDB
          const messageDoc = await Message.create({
            sender: socket.user._id,
            room: roomId,
            text: text || '',
            messageType,
            attachment: attachment || {},
            readBy: [{ user: socket.user._id, readAt: new Date() }]
          });

          savedMessage = await Message.findById(messageDoc._id).populate(
            'sender',
            'username email avatar isOnline lastSeen'
          );

          await Room.findByIdAndUpdate(roomId, {
            lastMessage: savedMessage._id,
            updatedAt: new Date()
          });
        }

        // Broadcast to all participants in this room (including sender)
        io.to(roomId).emit('new_message', savedMessage);

        // Also broadcast an activity ping for unread indicators
        io.emit('room_activity', {
          roomId,
          lastMessage: savedMessage
        });

        if (callback) callback({ success: true, message: savedMessage });
      } catch (err) {
        console.error('Socket send_message error:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // EVENT: Mark as read
    socket.on('mark_as_read', async ({ roomId }) => {
      try {
        if (!roomId) return;

        if (global.isUsingInMemoryDB) {
          const roomMsgs = global.inMemoryStore.messages.filter(
            (m) => m.room.toString() === roomId.toString()
          );
          roomMsgs.forEach((m) => {
            if (!m.readBy.some((r) => r.user.toString() === userId)) {
              m.readBy.push({ user: userId, readAt: new Date() });
            }
          });
        } else {
          await Message.updateMany(
            {
              room: roomId,
              'readBy.user': { $ne: socket.user._id }
            },
            {
              $push: { readBy: { user: socket.user._id, readAt: new Date() } }
            }
          );
        }

        socket.to(roomId).emit('messages_read', {
          roomId,
          userId: socket.user._id,
          readAt: new Date()
        });
      } catch (err) {
        console.warn('Mark as read error:', err.message);
      }
    });

    // EVENT: Disconnect
    socket.on('disconnect', async () => {
      console.log(`\x1b[31m[Socket Disconnected]\x1b[0m ${socket.user.username} (${socket.id})`);

      const userSockets = activeUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeUsers.delete(userId);

          // Update user to offline in DB
          const lastSeenTime = new Date();
          try {
            if (global.isUsingInMemoryDB) {
              const u = global.inMemoryStore.users.find(
                (usr) => usr._id.toString() === userId
              );
              if (u) {
                u.isOnline = false;
                u.lastSeen = lastSeenTime;
              }
            } else {
              await User.findByIdAndUpdate(userId, {
                isOnline: false,
                lastSeen: lastSeenTime
              });
            }
          } catch (err) {
            console.warn('Error updating offline state:', err.message);
          }

          // Broadcast offline event to all clients
          io.emit('user_offline', {
            userId,
            isOnline: false,
            lastSeen: lastSeenTime
          });
        }
      }
    });
  });
}

module.exports = setupSocketIO;
