const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'chitchat_fallback_secret_key',
    { expiresIn: '30d' }
  );
};

// Default avatar generator based on username
const getAvatarForUser = (name) => {
  const encoded = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encoded}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, avatar, statusMessage, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password'
      });
    }

    const assignedRole = ['Admin', 'Dev', 'VIP', 'Member'].includes(role) ? role : 'Member';

    if (global.isUsingInMemoryDB) {
      // In-Memory Mode
      const exists = global.inMemoryStore.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase()
      );
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = {
        _id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        username,
        email,
        password: hashedPassword,
        avatar: avatar || getAvatarForUser(username),
        role: assignedRole,
        statusMessage: statusMessage || 'Hey there! I am using ChitChat.',
        isOnline: true,
        lastSeen: new Date(),
        createdAt: new Date()
      };

      global.inMemoryStore.users.push(newUser);

      // Auto-add new user to public group rooms
      global.inMemoryStore.rooms.forEach((r) => {
        if (r.type === 'group' && !r.members.includes(newUser._id)) {
          r.members.push(newUser._id);
        }
      });

      const token = generateToken(newUser._id);
      const { password: _, ...userWithoutPass } = newUser;

      return res.status(201).json({
        success: true,
        token,
        user: userWithoutPass
      });
    }

    // MongoDB Mode
    const userExists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username }]
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
      avatar: avatar || getAvatarForUser(username),
      role: assignedRole,
      statusMessage: statusMessage || 'Hey there! I am using ChitChat.',
      isOnline: true
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        statusMessage: user.statusMessage,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body; // login can be username or email

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username/email and password'
      });
    }

    if (global.isUsingInMemoryDB) {
      const user = global.inMemoryStore.users.find(
        (u) =>
          u.email.toLowerCase() === login.toLowerCase() ||
          u.username.toLowerCase() === login.toLowerCase()
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email/username or password'
        });
      }

      // If user has hashed password, compare it
      if (user.password) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email/username or password'
          });
        }
      }

      user.isOnline = true;
      user.lastSeen = new Date();

      const token = generateToken(user._id);
      const { password: _, ...userWithoutPass } = user;

      return res.json({
        success: true,
        token,
        user: userWithoutPass
      });
    }

    // MongoDB Mode
    const user = await User.findOne({
      $or: [{ email: login.toLowerCase() }, { username: login }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password'
      });
    }

    user.isOnline = true;
    user.lastSeen = Date.now();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role || 'Member',
        statusMessage: user.statusMessage,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// @route   PUT /api/auth/profile
// @desc    Update current user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { statusMessage, avatar, username } = req.body;

    if (global.isUsingInMemoryDB) {
      const user = global.inMemoryStore.users.find(
        (u) => u._id.toString() === req.user._id.toString()
      );
      if (user) {
        if (statusMessage !== undefined) user.statusMessage = statusMessage;
        if (avatar !== undefined) user.avatar = avatar;
        if (username !== undefined) user.username = username;
      }
      return res.json({ success: true, user });
    }

    const user = await User.findById(req.user._id);
    if (statusMessage !== undefined) user.statusMessage = statusMessage;
    if (avatar !== undefined) user.avatar = avatar;
    if (username !== undefined) user.username = username;

    await user.save();

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users for directory / direct messaging
router.get('/users', protect, async (req, res) => {
  try {
    if (global.isUsingInMemoryDB) {
      const users = global.inMemoryStore.users
        .filter((u) => u._id.toString() !== req.user._id.toString())
        .map(({ password, ...u }) => u);
      return res.json({ success: true, users });
    }

    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('-password')
      .sort({ isOnline: -1, username: 1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
