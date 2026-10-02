const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

// @route   GET /api/messages/:roomId
// @desc    Get message history for a room
router.get('/:roomId', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    if (global.isUsingInMemoryDB) {
      const messages = global.inMemoryStore.messages
        .filter((m) => m.room.toString() === roomId.toString())
        .slice(-limit);

      return res.json({
        success: true,
        messages
      });
    }

    // MongoDB Mode
    const messages = await Message.find({ room: roomId })
      .populate('sender', 'username email avatar role isOnline lastSeen')
      .populate('readBy.user', 'username avatar')
      .sort({ createdAt: 1 })
      .limit(limit);

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/messages/:roomId
// @desc    Send a message (REST fallback)
router.post('/:roomId', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { text, messageType, attachment } = req.body;

    if (!text && !attachment?.url) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    if (global.isUsingInMemoryDB) {
      const newMsg = {
        _id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        sender: {
          _id: req.user._id,
          username: req.user.username,
          avatar: req.user.avatar
        },
        room: roomId,
        text: text || '',
        messageType: messageType || 'text',
        attachment: attachment || { url: '', name: '' },
        readBy: [{ user: req.user._id, readAt: new Date() }],
        createdAt: new Date()
      };

      global.inMemoryStore.messages.push(newMsg);

      // Emit through socket if io instance is attached
      if (req.app.get('io')) {
        req.app.get('io').to(roomId).emit('new_message', newMsg);
      }

      return res.status(201).json({
        success: true,
        message: newMsg
      });
    }

    // MongoDB Mode
    const newMessage = await Message.create({
      sender: req.user._id,
      room: roomId,
      text: text || '',
      messageType: messageType || 'text',
      attachment: attachment || {},
      readBy: [{ user: req.user._id, readAt: new Date() }]
    });

    const populated = await Message.findById(newMessage._id).populate(
      'sender',
      'username email avatar role isOnline lastSeen'
    );

    // Update room lastMessage
    await Room.findByIdAndUpdate(roomId, {
      lastMessage: populated._id,
      updatedAt: new Date()
    });

    if (req.app.get('io')) {
      req.app.get('io').to(roomId).emit('new_message', populated);
    }

    res.status(201).json({
      success: true,
      message: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/messages/:roomId/read
// @desc    Mark all messages in a room as read by current user
router.put('/:roomId/read', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();

    if (global.isUsingInMemoryDB) {
      const roomMsgs = global.inMemoryStore.messages.filter(
        (m) => m.room.toString() === roomId.toString()
      );
      roomMsgs.forEach((m) => {
        if (!m.readBy.some((r) => r.user.toString() === userId)) {
          m.readBy.push({ user: userId, readAt: new Date() });
        }
      });
      return res.json({ success: true });
    }

    // MongoDB Mode
    await Message.updateMany(
      {
        room: roomId,
        'readBy.user': { $ne: req.user._id }
      },
      {
        $push: { readBy: { user: req.user._id, readAt: new Date() } }
      }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
