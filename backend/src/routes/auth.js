import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// @desc    Setup first admin (one-time use)
// @route   POST /api/auth/setup
router.post('/setup', async (req, res) => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return res.status(400).json({ error: 'System already setup' });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide all fields' });
    }

    const admin = await Admin.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'admin',
    });

    res.status(201).json({
      success: true,
      token: generateToken(admin._id),
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error('Setup Error:', err);
    res.status(500).json({ error: 'Server error during setup' });
  }
});

// @desc    Register a new staff/admin (requires admin auth)
// @route   POST /api/auth/register
router.post('/register', protect, async (req, res) => {
  try {
    // Only admins can register new users
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to register new users' });
    }

    const { name, email, password, role } = req.body;

    const userExists = await Admin.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const admin = await Admin.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'staff',
    });

    res.status(201).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// @desc    Login admin
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Find admin and include password for comparison
    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

    if (admin && (await admin.comparePassword(password))) {
      if (!admin.isActive) {
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      // Update last login
      admin.lastLogin = new Date();
      await admin.save();

      res.json({
        success: true,
        token: generateToken(admin._id),
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// @desc    Get current admin profile
// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    admin: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
    },
  });
});

export default router;