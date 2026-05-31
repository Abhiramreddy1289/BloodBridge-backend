const express = require('express');
const {
  getBloodBanks,
  getNearbyBloodBanks,
  getBloodBankFilters,
} = require('../controllers/bloodBankController');

const router = express.Router();

router.get('/', getBloodBanks);
router.get('/nearby', getNearbyBloodBanks);
router.get('/filters', getBloodBankFilters);

module.exports = router;
