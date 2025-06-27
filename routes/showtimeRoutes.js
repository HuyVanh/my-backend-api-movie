const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers
const {
  getShowtimes,
  getShowtime,
  createShowtime,
  updateShowtime,
  deleteShowtime,
  generateShowtimes,
  deleteShowtimesByDateRange
} = require('../controllers/showtimeController');

// Routes công khai
router.route('/').get(getShowtimes);
router.route('/:id').get(getShowtime);

// Routes cho admin
router.use(protect);
router.use(authorize('admin'));

// Basic CRUD routes
router.route('/').post(createShowtime);
router.route('/:id')
  .put(updateShowtime)
  .delete(deleteShowtime);

// Bulk operations routes
router.route('/generate').post(generateShowtimes);
router.route('/bulk').delete(deleteShowtimesByDateRange);

module.exports = router;