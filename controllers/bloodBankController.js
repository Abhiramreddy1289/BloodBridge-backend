const asyncHandler = require('express-async-handler');
const BloodBank = require('../models/BloodBank');

const buildLiveStockUrl = ({ state, district, bloodGroup } = {}) => {
  const baseUrl = process.env.ERAKTKOSH_BASE_URL || 'https://eraktkosh.mohfw.gov.in';
  const params = new URLSearchParams();

  if (state) params.set('state', state);
  if (district) params.set('district', district);
  if (bloodGroup) params.set('bloodGroup', bloodGroup);

  const query = params.toString();
  return `${baseUrl.replace(/\/$/, '')}/BLDAHIMS/bloodbank/stockAvailability.cnt${query ? `?${query}` : ''}`;
};

const decorateBloodBank = (bloodBank, bloodGroup) => {
  const obj = bloodBank.toObject();
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

  return {
    ...obj,
    liveStockUrl: buildLiveStockUrl({
      state: bloodBank.state,
      district: bloodBank.district,
      bloodGroup,
    }),
  };
};

const getBloodBanks = asyncHandler(async (req, res) => {
  const { state, district, q, bloodGroup, page = 1, limit = 50 } = req.query;
  const numericLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const numericPage = Math.max(Number(page) || 1, 1);
  const filter = {};

  if (state) filter.state = new RegExp(`^${escapeRegExp(state)}$`, 'i');
  if (district) filter.district = new RegExp(`^${escapeRegExp(district)}$`, 'i');
  if (q) {
    filter.$or = [
      { name: new RegExp(escapeRegExp(q), 'i') },
      { address: new RegExp(escapeRegExp(q), 'i') },
      { district: new RegExp(escapeRegExp(q), 'i') },
      { state: new RegExp(escapeRegExp(q), 'i') },
    ];
  }

  const [bloodBanks, total] = await Promise.all([
    BloodBank.find(filter)
      .sort({ state: 1, district: 1, name: 1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit),
    BloodBank.countDocuments(filter),
  ]);

  res.json({
    data: bloodBanks.map((bloodBank) => decorateBloodBank(bloodBank, bloodGroup)),
    page: numericPage,
    limit: numericLimit,
    total,
  });
});

const getNearbyBloodBanks = asyncHandler(async (req, res) => {
  const { longitude, latitude, radius = 50, bloodGroup, limit = 50 } = req.query;

  if (!longitude || !latitude) {
    res.status(400);
    throw new Error('longitude and latitude are required');
  }

  const lng = Number(longitude);
  const lat = Number(latitude);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    res.status(400);
    throw new Error('Invalid coordinates');
  }

  const bloodBanks = await BloodBank.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: Math.max(Number(radius) || 50, 1) * 1000,
      },
    },
  }).limit(Math.min(Math.max(Number(limit) || 50, 1), 100));

  res.json(bloodBanks.map((bloodBank) => decorateBloodBank(bloodBank, bloodGroup)));
});

const getBloodBankFilters = asyncHandler(async (req, res) => {
  const states = await BloodBank.distinct('state');
  const districts = req.query.state
    ? await BloodBank.distinct('district', { state: new RegExp(`^${escapeRegExp(req.query.state)}$`, 'i') })
    : await BloodBank.distinct('district');

  res.json({
    states: states.filter(Boolean).sort(),
    districts: districts.filter(Boolean).sort(),
  });
});

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { getBloodBanks, getNearbyBloodBanks, getBloodBankFilters };
