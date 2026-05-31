const asyncHandler = require('express-async-handler');
const Story = require('../models/Story');
const BloodRequest = require('../models/BloodRequest');
const { sendNotification, templates } = require('../utils/notifications');

const getStories = asyncHandler(async (req, res) => {
  const stories = await Story.find({ isApproved: true }).sort({ createdAt: -1 });
  res.json(stories);
});

const createStory = asyncHandler(async (req, res) => {
  const { quote } = req.body;

  if (!quote) {
    res.status(400);
    throw new Error('Quote is required');
  }

  // Check if user has requested or donated at least once
  const hasParticipated = await BloodRequest.findOne({
    $or: [
      { requesterId: req.user._id, status: 'completed' },
      { donorId: req.user._id, status: 'completed' }
    ]
  });

  if (!hasParticipated) {
    res.status(403);
    throw new Error('Hero stories are reserved for those who have successfully completed a blood request or donation.');
  }

  const story = await Story.create({
    authorId: req.user._id,
    name: req.user.name,
    bloodGroup: req.user.bloodGroup,
    location: req.user.city,
    quote,
  });

  await sendNotification({
    to: req.user.email,
    subject: 'BloodBridge story submitted',
    template: templates.storyEmail(req.user),
  });

  res.status(201).json(story);
});

module.exports = { getStories, createStory };
