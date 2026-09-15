const bcrypt = require('bcryptjs');
const User = require('../models/User');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email existence and type
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate password existence and type
    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Validate basic email format
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await User.create({
      email: normalizedEmail,
      passwordHash
    });

    // Start authenticated session
    req.session.userId = newUser._id.toString();

    // Persist session before responding
    req.session.save((err) => {
      if (err) {
        console.error('[Auth] Error saving session on register:', err);
        return res.status(500).json({
          success: false,
          message: 'Error creating user session'
        });
      }

      return res.status(201).json({
        success: true,
        user: {
          id: newUser._id.toString(),
          email: newUser.email
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by normalized email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Do not reveal whether email or password was wrong
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare password hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Set authenticated session
    req.session.userId = user._id.toString();

    req.session.save((err) => {
      if (err) {
        console.error('[Auth] Error saving session on login:', err);
        return res.status(500).json({
          success: false,
          message: 'Error creating user session'
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  if (!req.session) {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('[Auth] Error destroying session:', err);
      return res.status(500).json({
        success: false,
        message: 'Could not log out'
      });
    }

    res.clearCookie('connect.sid', { path: '/' });
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Protected test endpoint for Stage 2 verification
 * GET /api/auth/protected-test
 */
const protectedTest = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Access granted to protected route',
    userId: req.userId
  });
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  protectedTest
};
