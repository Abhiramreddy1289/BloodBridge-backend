const asyncHandler = require('express-async-handler');
const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const { queueMany, queueNotification, templates } = require('../utils/notifications');

const compatibleDonorGroups = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

const createRequest = asyncHandler(async (req, res) => {
  const {
    patientName,
    bloodGroup,
    unitsRequired,
    hospitalName,
    hospitalAddress,
    city,
    urgencyLevel = 'medium',
    contactNumber,
    coordinates,
  } = req.body;

  if (!patientName || !bloodGroup || !unitsRequired || !hospitalName || !hospitalAddress || !city || !contactNumber) {
    res.status(400);
    throw new Error('All required fields must be provided');
  }

  const validCoordinates = Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates.every((value) => Number.isFinite(Number(value)));

  const request = await BloodRequest.create({
    requesterId: req.user._id,
    patientName,
    bloodGroup,
    unitsRequired,
    hospitalName,
    hospitalAddress,
    city,
    urgencyLevel,
    contactNumber,
    location: validCoordinates ? { type: 'Point', coordinates: coordinates.map(Number) } : undefined,
  });

  const matchingDonors = await User.find({
    role: 'donor',
    bloodGroup: { $in: compatibleDonorGroups[bloodGroup] || [bloodGroup] },
    availabilityStatus: true,
    isBlocked: false,
  }).select('-passwordHash');

  queueMany(matchingDonors, (donor) => ({
    to: donor.email,
    subject: `Emergency ${bloodGroup} blood request`,
    template: templates.requestAlertEmail({ donor, request }),
  }));

  queueNotification({
    to: req.user.email,
    subject: 'BloodBridge request created',
    template: templates.requestStatusEmail({ user: req.user, request, status: 'created' }),
  });

  const admins = await User.find({ role: 'admin', isBlocked: false }).select('name email role isBlocked');
  queueMany(admins, (adminUser) => ({
    to: adminUser.email,
    subject: `New BloodBridge SOS: ${bloodGroup}`,
    template: templates.requestStatusEmail({ user: adminUser, request, status: 'created' }),
  }));

  res.status(201).json({ request, matchingDonorsCount: matchingDonors.length });
});

const getRequests = asyncHandler(async (req, res) => {
  const query = {};

  if (req.user.role === 'donor') {
    query.$or = [
      { requesterId: req.user._id },
      { donorId: req.user._id },
      { status: 'pending' },
    ];
  } else if (req.user.role !== 'admin') {
    query.$or = [{ requesterId: req.user._id }, { donorId: req.user._id }];
  }

  const requests = await BloodRequest.find(query)
    .populate('requesterId', 'name email bloodGroup city')
    .populate('donorId', 'name email bloodGroup city')
    .sort({ createdAt: -1 });

  res.json(requests);
});

const getRequestById = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findById(req.params.id)
    .populate('requesterId', 'name email bloodGroup city')
    .populate('donorId', 'name email bloodGroup city');

  if (!request) {
    res.status(404);
    throw new Error('Blood request not found');
  }

  if (req.user.role !== 'admin') {
    const isOwner = request.requesterId._id.equals(req.user._id);
    const isDonor = request.donorId && request.donorId._id.equals(req.user._id);
    const canViewPendingAsDonor = req.user.role === 'donor' && request.status === 'pending';
    if (!isOwner && !isDonor && !canViewPendingAsDonor) {
      res.status(403);
      throw new Error('Access denied');
    }
  }

  const response = request.toObject();
  const isOwner = request.requesterId._id.equals(req.user._id);
  const isAssignedDonor = request.donorId && request.donorId._id.equals(req.user._id);
  const canSeeContact = req.user.role === 'admin' || isOwner || isAssignedDonor || request.status !== 'pending';

  if (!canSeeContact) {
    delete response.contactNumber;
  }

  res.json(response);
});

const acceptRequest = asyncHandler(async (req, res) => {
  const { eta } = req.body;
  const request = await BloodRequest.findById(req.params.id);

  if (!request) {
    res.status(404);
    throw new Error('Blood request not found');
  }

  if (request.status !== 'pending') {
    res.status(400);
    throw new Error('Request is already accepted or fulfilled');
  }

  if (req.user.role !== 'donor') {
    res.status(403);
    throw new Error('Only donors can accept blood requests');
  }

  if (request.requesterId.equals(req.user._id)) {
    res.status(400);
    throw new Error('You cannot accept your own blood request');
  }

  request.donorId = req.user._id;
  request.status = 'on_the_way';
  request.acceptedAt = new Date();
  request.donorETA = eta || 30;
  await request.save();

  const donor = await User.findById(req.user._id);
  donor.availabilityStatus = false;
  await donor.save();

  const requester = await User.findById(request.requesterId);
  if (requester) {
    queueNotification({
      to: requester.email,
      subject: 'A donor accepted your BloodBridge request',
      template: templates.requestStatusEmail({ user: requester, request, status: 'on_the_way' }),
    });
  }
  queueNotification({
    to: donor.email,
    subject: 'You accepted a BloodBridge request',
    template: templates.requestStatusEmail({ user: donor, request, status: 'on_the_way' }),
  });

  res.json(request);
});

const updateRequestStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['pending', 'on_the_way', 'arrived', 'completed', 'cancelled'];

  if (!allowedStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid request status');
  }

  const request = await BloodRequest.findById(req.params.id);

  if (!request) {
    res.status(404);
    throw new Error('Blood request not found');
  }

  const isRequester = request.requesterId.equals(req.user._id);
  const isAssignedDonor = request.donorId && request.donorId.equals(req.user._id);
  const isAdmin = req.user.role === 'admin';

  if (status === 'arrived' && !isAssignedDonor && !isAdmin) {
    res.status(403);
    throw new Error('Only the assigned donor can mark arrival');
  }

  if (status === 'completed' && !isRequester && !isAdmin) {
    res.status(403);
    throw new Error('Only the requester or an admin can complete the request');
  }

  if (status === 'cancelled' && !isRequester && !isAdmin) {
    res.status(403);
    throw new Error('Only the requester or an admin can cancel the request');
  }

  if (status === 'completed') {
    request.status = 'completed';
    request.completedAt = new Date();
    request.duration = Math.round((request.completedAt - request.createdAt) / (1000 * 60));

    const donor = await User.findById(request.donorId);
    if (donor) {
      donor.reliabilityScore = Math.min(100, donor.reliabilityScore + 2);
      donor.lastDonationDate = new Date();
      donor.availabilityStatus = true;
      await donor.save();
    }
  } else if (status === 'cancelled') {
    request.status = 'cancelled';
    if (request.donorId) {
      const donor = await User.findById(request.donorId);
      if (donor) {
        donor.availabilityStatus = true;
        await donor.save();
      }
    }
  } else {
    request.status = status;
  }

  await request.save();

  const [requester, donor] = await Promise.all([
    User.findById(request.requesterId),
    request.donorId ? User.findById(request.donorId) : null,
  ]);

  if (requester) {
    queueNotification({
      to: requester.email,
      subject: `BloodBridge request ${request.status}`,
      template: templates.requestStatusEmail({ user: requester, request, status: request.status }),
    });
  }
  if (donor) {
    queueNotification({
      to: donor.email,
      subject: `BloodBridge request ${request.status}`,
      template: templates.requestStatusEmail({ user: donor, request, status: request.status }),
    });
  }

  const admins = await User.find({ role: 'admin', isBlocked: false }).select('name email role isBlocked');
  queueMany(admins, (adminUser) => ({
    to: adminUser.email,
    subject: `BloodBridge request ${request.status}`,
    template: templates.requestStatusEmail({ user: adminUser, request, status: request.status }),
  }));

  res.json(request);
});

module.exports = { createRequest, getRequests, getRequestById, acceptRequest, updateRequestStatus };
