const mongoose = require('mongoose');

const requireDatabase = (req, res, next) => {
  // state 1 = connected
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  // state 2 = connecting
  if (mongoose.connection.readyState === 2) {
    return res.status(503).json({
      message: 'Database is still connecting... Please try again in a moment.',
      status: 'connecting'
    });
  }

  return res.status(503).json({
    message: 'Database connection is currently unavailable.',
    hint: 'Ensure your MongoDB Atlas cluster is active, your IP is whitelisted, and the MONGO_URI in backend/.env is correct.',
    error: 'Mongoose Connection State: ' + mongoose.connection.readyState
  });
};

module.exports = requireDatabase;

