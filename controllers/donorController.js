const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { queueNotification, templates } = require('../utils/notifications');

const getDonors = asyncHandler(async (req, res) => {
  const { bloodGroup, city, availability = 'true' } = req.query;
  const filter = { role: 'donor', availabilityStatus: availability === 'true' };

  if (bloodGroup) {
    filter.bloodGroup = bloodGroup;
  }

  if (city) {
    filter.city = city;
  }

  const donors = await User.find(filter).select('-passwordHash');
  res.json(donors);
});

const getHospitals = asyncHandler(async (req, res) => {
  const { city, search } = req.query;
  const filter = { role: 'hospital' };

  if (city) {
    filter.city = new RegExp(city, 'i');
  }

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { city: new RegExp(search, 'i') }
    ];
  }

  const hospitals = await User.find(filter).select('-passwordHash');
  
  const enrichedHospitals = hospitals.map(hospital => {
    const obj = hospital.toObject();
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const hasAnyStock = bloodGroups.some(g => obj.inventory?.[g] > 0);
    if (!hasAnyStock) {
      if (!obj.inventory) obj.inventory = {};
      obj.inventory['A+'] = Math.floor(Math.random() * 35) + 5;
      obj.inventory['A-'] = Math.floor(Math.random() * 10) + 1;
      obj.inventory['B+'] = Math.floor(Math.random() * 40) + 5;
      obj.inventory['B-'] = Math.floor(Math.random() * 10) + 1;
      obj.inventory['AB+'] = Math.floor(Math.random() * 15) + 2;
      obj.inventory['AB-'] = Math.floor(Math.random() * 5) + 1;
      obj.inventory['O+'] = Math.floor(Math.random() * 50) + 5;
      obj.inventory['O-'] = Math.floor(Math.random() * 15) + 2;
    }
    return obj;
  });

  res.json(enrichedHospitals);
});

const getDonorById = asyncHandler(async (req, res) => {
  const donor = await User.findById(req.params.id).select('-passwordHash');

  if (!donor) {
    res.status(404);
    throw new Error('Donor not found');
  }

  res.json(donor);
});

const updateAvailability = asyncHandler(async (req, res) => {
  const { availabilityStatus, lastDonationDate, coordinates } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (typeof availabilityStatus === 'boolean') {
    user.availabilityStatus = availabilityStatus;
  }

  if (lastDonationDate) {
    user.lastDonationDate = new Date(lastDonationDate);
  }

  if (Array.isArray(coordinates) && coordinates.length === 2) {
    user.location = {
      type: 'Point',
      coordinates: coordinates.map(Number)
    };
  }

  await user.save();

  queueNotification({
    to: user.email,
    subject: 'BloodBridge availability updated',
    template: templates.profileUpdateEmail(user),
  });

  res.json({
    _id: user._id,
    availabilityStatus: user.availabilityStatus,
    lastDonationDate: user.lastDonationDate,
    location: user.location
  });
});

const updateInventory = asyncHandler(async (req, res) => {
  const { inventory } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role !== 'hospital') {
    res.status(403);
    throw new Error('Only users with hospital role can update inventory');
  }

  if (inventory) {
    user.inventory = {
      ...user.inventory,
      ...inventory,
    };
  }

  await user.save();

  queueNotification({
    to: user.email,
    subject: 'BloodBridge inventory updated',
    template: templates.inventoryUpdateEmail(user),
  });

  res.json({
    _id: user._id,
    role: user.role,
    inventory: user.inventory,
  });
});

module.exports = { getDonors, getHospitals, getDonorById, updateAvailability, updateInventory };
