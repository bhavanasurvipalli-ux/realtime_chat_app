const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return this.messageType !== 'system';
      }
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true
    },
    text: {
      type: String,
      trim: true,
      default: ''
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'audio', 'system'],
      default: 'text'
    },
    attachment: {
      url: { type: String, default: '' },
      name: { type: String, default: '' },
      size: { type: Number, default: 0 }
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Index to retrieve chat history chronologically by room
messageSchema.index({ room: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
