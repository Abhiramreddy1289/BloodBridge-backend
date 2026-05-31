const express = require('express');
const { getCamps, createCamp, approveCamp } = require('../controllers/campController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getCamps);
router.post('/', protect, createCamp);
router.put('/:id/approve', protect, admin, approveCamp);

module.exports = router;
