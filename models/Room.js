const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [50, 'Room name cannot exceed 50 characters']
    },
    description: {
      type: String,
      default: '',
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    type: {
      type: String,
      enum: ['direct', 'group'],
      default: 'group'
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    avatar: {
      type: String,
      default: ''
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Helpful index for finding rooms user belongs to
roomSchema.index({ members: 1 });
roomSchema.index({ type: 1 });

module.exports = mongoose.model('Room', roomSchema);
