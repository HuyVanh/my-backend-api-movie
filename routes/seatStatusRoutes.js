const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers (chúng ta sẽ tạo sau)
const {
  getSeatStatuses,
  getSeatStatus,
  createSeatStatus,
  updateSeatStatus,
  deleteSeatStatus,
  getSeatStatusByRoom
} = require('../controllers/seatStatusController');

// Routes công khai
router.route('/room/:roomId').get(getSeatStatusByRoom);

// Routes cho user đã đăng nhập
router.use(protect);

// Routes cho admin
router.use(authorize('admin'));

router.route('/')
  .get(getSeatStatuses)
  .post(createSeatStatus);

router.route('/:id')
  .get(getSeatStatus)
  .put(updateSeatStatus)
  .delete(deleteSeatStatus);

module.exports = router;