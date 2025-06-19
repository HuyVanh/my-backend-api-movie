const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers (chúng ta sẽ tạo sau)
const {
  getShowtimes,
  getShowtime,
  createShowtime,
  updateShowtime,
  deleteShowtime
} = require('../controllers/showtimeController');

// Routes công khai
router.route('/').get(getShowtimes);
router.route('/:id').get(getShowtime);

// Routes cho admin
router.use(protect);
router.use(authorize('admin'));

router.route('/').post(createShowtime);
router.route('/:id')
  .put(updateShowtime)
  .delete(deleteShowtime);

module.exports = router;