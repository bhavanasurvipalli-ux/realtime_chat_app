const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/rooms
// @desc    Get all accessible rooms and direct chats for the current user
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    if (global.isUsingInMemoryDB) {
      // Find all group rooms and direct chats involving current user
      const rooms = global.inMemoryStore.rooms
        .filter((r) => {
          if (r.type === 'group') return true;
          return r.members.some((m) => m.toString() === userId);
        })
        .map((r) => {
          // Populate members
          const populatedMembers = r.members.map((mId) => {
            const u = global.inMemoryStore.users.find(
              (usr) => usr._id.toString() === mId.toString()
            );
            if (!u) return { _id: mId, username: 'Unknown', isOnline: false };
            const { password, ...safeUser } = u;
            return safeUser;
          });

          // If direct room, title it with the other user's name
          let displayName = r.name;
          let displayAvatar = r.avatar;
          let otherUser = null;

          if (r.type === 'direct') {
            otherUser = populatedMembers.find(
              (m) => m._id.toString() !== userId
            );
            if (otherUser) {
              displayName = otherUser.username;
              displayAvatar = otherUser.avatar;
            }
          }

          // Last message
          const lastMsg = global.inMemoryStore.messages
            .filter((m) => m.room.toString() === r._id.toString())
            .slice(-1)[0] || null;

          return {
            ...r,
            displayName: displayName || 'Direct Chat',
            displayAvatar: displayAvatar || '👤',
            otherUser,
            members: populatedMembers,
            lastMessage: lastMsg
          };
        });

      return res.json({ success: true, rooms });
    }

    // MongoDB Mode
    const rooms = await Room.find({
      $or: [
        { type: 'group' },
        { members: req.user._id }
      ]
    })
      .populate('members', 'username email avatar isOnline lastSeen statusMessage')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    const formattedRooms = rooms.map((r) => {
      const roomObj = r.toObject();
      let displayName = roomObj.name;
      let displayAvatar = roomObj.avatar;
      let otherUser = null;

      if (roomObj.type === 'direct') {
        otherUser = roomObj.members.find(
          (m) => m._id.toString() !== req.user._id.toString()
        );
        if (otherUser) {
          displayName = otherUser.username;
          displayAvatar = otherUser.avatar;
        }
      }

      return {
        ...roomObj,
        displayName: displayName || 'Direct Chat',
        displayAvatar: displayAvatar || '👤',
        otherUser
      };
    });

    res.json({ success: true, rooms: formattedRooms });
  } catch (error) {
    console.error('Fetch rooms error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/rooms
// @desc    Create a new group room
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, avatar, isPrivate } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Room name is required'
      });
    }

    if (global.isUsingInMemoryDB) {
      const newRoom = {
        _id: 'room_' + Date.now(),
        name: name.trim(),
        description: description || '',
        avatar: avatar || '💬',
        type: 'group',
        isPrivate: !!isPrivate,
        members: [req.user._id.toString()],
        admins: [req.user._id.toString()],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      global.inMemoryStore.rooms.push(newRoom);

      return res.status(201).json({
        success: true,
        room: {
          ...newRoom,
          displayName: newRoom.name,
          displayAvatar: newRoom.avatar,
          members: [req.user]
        }
      });
    }

    // MongoDB Mode
    const newRoom = await Room.create({
      name: name.trim(),
      description: description || '',
      avatar: avatar || '💬',
      type: 'group',
      isPrivate: !!isPrivate,
      members: [req.user._id],
      admins: [req.user._id]
    });

    const populated = await Room.findById(newRoom._id).populate(
      'members',
      'username email avatar isOnline lastSeen'
    );

    res.status(201).json({
      success: true,
      room: {
        ...populated.toObject(),
        displayName: populated.name,
        displayAvatar: populated.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/rooms/direct
// @desc    Find or create a 1-to-1 direct conversation with another user
router.post('/direct', protect, async (req, res) => {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user._id.toString();

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required'
      });
    }

    if (recipientId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot start a direct chat with yourself'
      });
    }

    if (global.isUsingInMemoryDB) {
      // Find recipient
      const recipient = global.inMemoryStore.users.find(
        (u) => u._id.toString() === recipientId
      );
      if (!recipient) {
        return res.status(404).json({ success: false, message: 'Recipient not found' });
      }

      // Check if direct room already exists between these 2 users
      let directRoom = global.inMemoryStore.rooms.find((r) => {
        if (r.type !== 'direct') return false;
        const m = r.members.map((id) => id.toString());
        return m.includes(currentUserId) && m.includes(recipientId);
      });

      if (!directRoom) {
        directRoom = {
          _id: 'dm_' + Date.now(),
          type: 'direct',
          members: [currentUserId, recipientId],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        global.inMemoryStore.rooms.push(directRoom);
      }

      const { password: _, ...safeRecipient } = recipient;
      return res.json({
        success: true,
        room: {
          ...directRoom,
          displayName: recipient.username,
          displayAvatar: recipient.avatar,
          otherUser: safeRecipient,
          members: [req.user, safeRecipient]
        }
      });
    }

    // MongoDB Mode
    const recipient = await User.findById(recipientId).select('-password');
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    let room = await Room.findOne({
      type: 'direct',
      members: { $all: [req.user._id, recipientId], $size: 2 }
    }).populate('members', 'username email avatar isOnline lastSeen statusMessage');

    if (!room) {
      room = await Room.create({
        type: 'direct',
        members: [req.user._id, recipientId],
        admins: [req.user._id]
      });

      room = await Room.findById(room._id).populate(
        'members',
        'username email avatar isOnline lastSeen statusMessage'
      );
    }

    res.json({
      success: true,
      room: {
        ...room.toObject(),
        displayName: recipient.username,
        displayAvatar: recipient.avatar,
        otherUser: recipient
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
