const express = require('express');
const { createRequest, getRequests, getRequestById, acceptRequest, updateRequestStatus } = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createRequest);
router.get('/', protect, getRequests);
router.get('/:id', protect, getRequestById);
router.put('/:id/accept', protect, acceptRequest);
router.put('/:id/status', protect, updateRequestStatus);

module.exports = router;
