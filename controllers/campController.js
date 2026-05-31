const asyncHandler = require('express-async-handler');
const Camp = require('../models/Camp');
const User = require('../models/User');
const { notifyMany, sendNotification, templates } = require('../utils/notifications');

const getCamps = asyncHandler(async (req, res) => {
  const query = req.user && req.user.role === 'admin' ? {} : { isApproved: true };
  const camps = await Camp.find(query).sort({ date: 1 });
  res.json(camps);
});

const createCamp = asyncHandler(async (req, res) => {
  const { title, date, location, organiser, phone } = req.body;

  if (!title || !date || !location || !organiser || !phone) {
    res.status(400);
    throw new Error('Please fill all fields');
  }

  const camp = await Camp.create({
    title,
    date,
    location,
    organiser,
    phone,
    postedBy: req.user._id,
    isApproved: req.user.role === 'admin' // Admins auto-approve
  });

  await sendNotification({
    to: req.user.email,
    subject: camp.isApproved ? 'BloodBridge camp published' : 'BloodBridge camp submitted for approval',
    template: templates.campEmail(camp, camp.isApproved ? 'new' : 'submitted'),
  });

  if (camp.isApproved) {
    await notifyCampAnnouncement(camp);
    camp.announcementSentAt = new Date();
    await camp.save();
  }

  res.status(201).json(camp);
});

const approveCamp = asyncHandler(async (req, res) => {
  const camp = await Camp.findById(req.params.id);

  if (!camp) {
    res.status(404);
    throw new Error('Camp not found');
  }

  camp.isApproved = true;
  await camp.save();

  if (!camp.announcementSentAt) {
    await notifyCampAnnouncement(camp);
    camp.announcementSentAt = new Date();
  }
  await camp.save();

  res.json({ message: 'Camp approved successfully' });
});

const notifyCampAnnouncement = async (camp) => {
  const users = await User.find({ isBlocked: false }).select('name email isBlocked');
  await notifyMany(users, (user) => ({
    to: user.email,
    subject: `New BloodBridge camp: ${camp.title}`,
    template: templates.campEmail(camp, 'new'),
  }));
};

module.exports = { getCamps, createCamp, approveCamp };
