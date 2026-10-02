// Real-Time Socket.IO Manager
class SocketManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.onlineUsers = new Set();
    this.currentRoomId = null;
  }

  connect(token) {
    if (this.socket) {
      this.socket.disconnect();
    }

    if (typeof io === 'undefined') {
      console.error('Socket.IO library not loaded');
      return;
    }

    this.socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupInternalHandlers();
  }

  setupInternalHandlers() {
    this.socket.on('connect', () => {
      console.log('✔ Socket.IO connected with ID:', this.socket.id);
      this.trigger('connect');

      // Re-join current room if any after reconnect
      if (this.currentRoomId) {
        this.joinRoom(this.currentRoomId);
      }
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message);
      this.trigger('connect_error', err);
    });

    this.socket.on('online_users_list', (userIds) => {
      this.onlineUsers = new Set(userIds);
      this.trigger('online_users_updated', Array.from(this.onlineUsers));
    });

    this.socket.on('user_online', (data) => {
      this.onlineUsers.add(data.userId);
      this.trigger('user_online', data);
      this.trigger('online_users_updated', Array.from(this.onlineUsers));
    });

    this.socket.on('user_offline', (data) => {
      this.onlineUsers.delete(data.userId);
      this.trigger('user_offline', data);
      this.trigger('online_users_updated', Array.from(this.onlineUsers));
    });

    this.socket.on('new_message', (message) => {
      this.trigger('new_message', message);
    });

    this.socket.on('room_activity', (data) => {
      this.trigger('room_activity', data);
    });

    this.socket.on('typing_start', (data) => {
      this.trigger('typing_start', data);
    });

    this.socket.on('typing_stop', (data) => {
      this.trigger('typing_stop', data);
    });

    this.socket.on('messages_read', (data) => {
      this.trigger('messages_read', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.trigger('disconnect', reason);
    });
  }

  isUserOnline(userId) {
    return this.onlineUsers.has(userId?.toString());
  }

  joinRoom(roomId) {
    if (!this.socket || !roomId) return;
    if (this.currentRoomId && this.currentRoomId !== roomId) {
      this.leaveRoom(this.currentRoomId);
    }
    this.currentRoomId = roomId;
    this.socket.emit('join_room', { roomId });
  }

  leaveRoom(roomId) {
    if (!this.socket || !roomId) return;
    this.socket.emit('leave_room', { roomId });
    if (this.currentRoomId === roomId) {
      this.currentRoomId = null;
    }
  }

  sendMessage(roomId, text, messageType = 'text', attachment = null, callback) {
    if (!this.socket) return;
    this.socket.emit(
      'send_message',
      { roomId, text, messageType, attachment },
      callback
    );
  }

  startTyping(roomId) {
    if (!this.socket || !roomId) return;
    this.socket.emit('typing_start', { roomId });
  }

  stopTyping(roomId) {
    if (!this.socket || !roomId) return;
    this.socket.emit('typing_stop', { roomId });
  }

  markAsRead(roomId) {
    if (!this.socket || !roomId) return;
    this.socket.emit('mark_as_read', { roomId });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.onlineUsers.clear();
      this.currentRoomId = null;
    }
  }

  // Pub/Sub event system
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  off(event, handler) {
    if (!this.listeners.has(event)) return;
    const filtered = this.listeners.get(event).filter((h) => h !== handler);
    this.listeners.set(event, filtered);
  }

  trigger(event, payload) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((handler) => {
        try {
          handler(payload);
        } catch (e) {
          console.error(`Error in socket listener [${event}]:`, e);
        }
      });
    }
  }
}

window.socketManager = new SocketManager();
