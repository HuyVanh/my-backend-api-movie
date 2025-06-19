const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');

// Import controllers (chúng ta sẽ tạo sau)
const {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');

// Routes công khai
router.route('/').get(getRooms);
router.route('/:id').get(getRoom);

// Routes cho admin
router.use(protect);
router.use(authorize('admin'));

router.route('/').post(createRoom);
router.route('/:id')
  .put(updateRoom)
  .delete(deleteRoom);

module.exports = router;