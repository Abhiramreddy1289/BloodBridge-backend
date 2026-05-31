const express = require('express');
const { getUsers, getRequests, deleteFakeRequest, getAnalytics, updateUserStatus } = require('../controllers/adminController');
const { getCamps } = require('../controllers/campController');
const { protect, admin } = require('../middleware/authMiddleware');
const { verifyEmailTransport } = require('../utils/notifications');

const router = express.Router();

router.use(protect, admin);
router.get('/users', getUsers);
router.put('/users/status', updateUserStatus);
router.get('/requests', getRequests);
router.get('/camps', getCamps);
router.delete('/fake-request/:id', deleteFakeRequest);
router.get('/analytics', getAnalytics);
router.get('/email-health', async (req, res) => {
  const status = await verifyEmailTransport();
  res.status(status.ready ? 200 : 503).json(status);
});

module.exports = router;
