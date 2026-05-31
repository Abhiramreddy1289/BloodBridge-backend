const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-passwordHash');
  res.json(users);
});

const getRequests = asyncHandler(async (req, res) => {
  const requests = await BloodRequest.find()
    .populate('requesterId', 'name email bloodGroup city')
    .populate('donorId', 'name email bloodGroup city')
    .sort({ createdAt: -1 });

  res.json(requests);
});

const deleteFakeRequest = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findById(req.params.id);

  if (!request) {
    res.status(404);
    throw new Error('Fake request not found');
  }

  await request.deleteOne();
  res.json({ message: 'Blood request removed successfully' });
});

const getAnalytics = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeDonors = await User.countDocuments({ availabilityStatus: true });
  const totalRequests = await BloodRequest.countDocuments();
  const activeRequests = await BloodRequest.countDocuments({ status: { $in: ['pending', 'on_the_way', 'arrived'] } });
  const completedRequests = await BloodRequest.countDocuments({ status: 'completed' });

  res.json({
    totalUsers,
    activeDonors,
    totalRequests,
    activeRequests,
    completedRequests,
  });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId, isBlocked } = req.body;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isBlocked = isBlocked;
  await user.save();

  res.json({ message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`, user });
});

module.exports = { getUsers, getRequests, deleteFakeRequest, getAnalytics, updateUserStatus };
