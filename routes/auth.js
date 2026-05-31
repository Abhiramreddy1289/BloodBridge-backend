const express = require('express');
const { registerUser, loginUser, getMe, updateAvatar, logoutUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/avatar', protect, updateAvatar);
router.post('/logout', protect, logoutUser);

module.exports = router;
