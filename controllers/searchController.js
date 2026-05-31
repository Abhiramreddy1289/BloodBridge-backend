const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const searchDonors = asyncHandler(async (req, res) => {
  const { bloodGroup, longitude, latitude, radius = 20 } = req.query;
  
  const filter = { 
    role: 'donor', 
    availabilityStatus: true,
    isBlocked: false 
  };

  if (bloodGroup) {
    filter.bloodGroup = bloodGroup;
  }

  if (longitude && latitude) {
    filter.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        $maxDistance: radius * 1000, // Distance in meters
      },
    };
  }

  const donors = await User.find(filter).select('-passwordHash');
  res.json(donors);
});

module.exports = { searchDonors };
