const mongoose = require('mongoose');

// Seed default group channels
const seedDefaultRooms = async (Room) => {
  try {
    const existing = await Room.countDocuments();
    if (existing === 0) {
      console.log('Seeding initial community chat rooms...');
      await Room.insertMany([
        {
          name: 'General',
          description: 'Welcome channel for all team members and friends.',
          type: 'group',
          avatar: '💬',
          members: []
        },
        {
          name: 'Tech & Code',
          description: 'Discuss web development, Node.js, Socket.IO, and architectures.',
          type: 'group',
          avatar: '⚡',
          members: []
        },
        {
          name: 'Random & Fun',
          description: 'Memes, music, off-topic discussions, and casual chit-chat.',
          type: 'group',
          avatar: '🎉',
          members: []
        }
      ]);
      console.log('✓ Default chat rooms created (#General, #Tech & Code, #Random & Fun)');
    }
  } catch (err) {
    console.warn('Notice while checking default rooms:', err.message);
  }
};

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chitchat';
  
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2500 // Don't hang indefinitely if local daemon is absent
    });

    console.log(`\x1b[32m✔ MongoDB Connected: ${conn.connection.host}\x1b[0m`);
    global.isUsingInMemoryDB = false;

    // Seed default rooms
    const Room = require('../models/Room');
    await seedDefaultRooms(Room);

  } catch (error) {
    console.warn('\x1b[33m! Local MongoDB instance not detected at:\x1b[0m', mongoURI);
    console.log('\x1b[36mℹ Enabling ChitChat High-Speed In-Memory DB Mode so you can chat right away!\x1b[0m');
    console.log('\x1b[90m(To use MongoDB Atlas or local MongoDB, start mongod or paste your connection string into backend/.env)\x1b[0m\n');
    
    global.isUsingInMemoryDB = true;
    initializeInMemoryStore();
  }
};

// Resilient In-Memory DB Mock Store
function initializeInMemoryStore() {
  const now = new Date();
  global.inMemoryStore = {
    users: [
      {
        _id: 'user_bot_1',
        username: 'Ada Lovelace',
        email: 'ada@chitchat.dev',
        password: '', // mock
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'Admin',
        statusMessage: 'Writing the first computer algorithms 💻',
        isOnline: true,
        lastSeen: now,
        createdAt: now
      },
      {
        _id: 'user_bot_2',
        username: 'Alan Turing',
        email: 'alan@chitchat.dev',
        password: '', // mock
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        role: 'Dev',
        statusMessage: 'Cracking Enigma & testing machine intelligence ⚡',
        isOnline: true,
        lastSeen: now,
        createdAt: now
      }
    ],
    rooms: [
      {
        _id: 'room_general',
        name: 'General',
        description: 'Welcome channel for all team members and friends.',
        type: 'group',
        avatar: '💬',
        members: ['user_bot_1', 'user_bot_2'],
        admins: [],
        createdAt: now
      },
      {
        _id: 'room_tech',
        name: 'Tech & Code',
        description: 'Discuss web development, Node.js, Socket.IO, and architectures.',
        type: 'group',
        avatar: '⚡',
        members: ['user_bot_1', 'user_bot_2'],
        admins: [],
        createdAt: now
      },
      {
        _id: 'room_random',
        name: 'Random & Fun',
        description: 'Memes, music, off-topic discussions, and casual chit-chat.',
        type: 'group',
        avatar: '🎉',
        members: ['user_bot_1'],
        admins: [],
        createdAt: now
      }
    ],
    messages: [
      {
        _id: 'msg_welcome_1',
        sender: {
          _id: 'user_bot_1',
          username: 'Ada Lovelace',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        },
        room: 'room_general',
        text: 'Hello everyone! Welcome to ChitChat real-time messaging 🚀',
        messageType: 'text',
        readBy: [],
        createdAt: new Date(Date.now() - 1000 * 60 * 15)
      },
      {
        _id: 'msg_welcome_2',
        sender: {
          _id: 'user_bot_2',
          username: 'Alan Turing',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
        },
        room: 'room_general',
        text: 'Socket.IO live connections, typing indicators, and rooms are live!',
        messageType: 'text',
        readBy: [],
        createdAt: new Date(Date.now() - 1000 * 60 * 10)
      }
    ]
  };
}

module.exports = connectDB;
