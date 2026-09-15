const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  protectedTest
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', getMe);
router.get('/protected-test', requireAuth, protectedTest);

module.exports = router;
