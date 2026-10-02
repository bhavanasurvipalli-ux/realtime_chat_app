require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes');
const setupSocketIO = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  pingTimeout: 60000
});

// Attach io to express app for route access
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
connectDB();

// Setup Real-Time Socket.IO Handlers
setupSocketIO(io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

// System Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    appName: 'ChitChat Real-Time Server',
    database: global.isUsingInMemoryDB ? 'In-Memory DB (Active)' : 'MongoDB (Connected)',
    timestamp: new Date()
  });
});

// Serve Frontend Static Assets
const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));

// Serve index.html for any other route (SPA Fallback)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 \x1b[36mChitChat Server is running on port ${PORT}\x1b[0m`);
  console.log(`🌐 \x1b[32mOpen in browser: http://localhost:${PORT}\x1b[0m`);
  console.log(`🔌 \x1b[35mSocket.IO endpoint ready for live messaging\x1b[0m`);
  console.log(`=================================================\n`);
});
