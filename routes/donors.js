const express = require('express');
const { getDonors, getHospitals, getDonorById, updateAvailability, updateInventory } = require('../controllers/donorController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getDonors);
router.get('/hospitals', getHospitals);
router.get('/:id', getDonorById);
router.put('/availability', protect, updateAvailability);
router.put('/inventory', protect, updateInventory);

module.exports = router;
