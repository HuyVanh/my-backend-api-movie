const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');

// Import controllers (chúng ta sẽ tạo sau)
const {
  getSeats,
  getSeat,
  createSeat,
  updateSeat,
  deleteSeat,
  getAvailableSeats
} = require('../controllers/seatController');

// Routes công khai
router.route('/').get(getSeats);
router.route('/available').get(getAvailableSeats);
router.route('/:id').get(getSeat);

// Routes cho admin
router.use(protect);
router.use(authorize('admin'));

router.route('/').post(createSeat);
router.route('/:id')
  .put(updateSeat)
  .delete(deleteSeat);

module.exports = router;