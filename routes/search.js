const express = require('express');
const { searchDonors } = require('../controllers/searchController');

const router = express.Router();

router.get('/', searchDonors);

module.exports = router;
