const express = require('express');
const { getStories, createStory } = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getStories);
router.post('/', protect, createStory);

module.exports = router;
