// routes/roomRoutes.js
const express = require('express');
const router = express.Router();

// Import controller functions
const {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomsByCinema,
  getRoomsByStatus
} = require('../controllers/roomController');

// @route   GET /api/rooms
// @desc    Lấy tất cả phòng chiếu
// @access  Public
router.get('/', getRooms);

// @route   GET /api/rooms/cinema/:cinemaId
// @desc    Lấy phòng chiếu theo cinema
// @access  Public
router.get('/cinema/:cinemaId', getRoomsByCinema);

// @route   GET /api/rooms/:id
// @desc    Lấy chi tiết phòng chiếu
// @access  Public
router.get('/:id', getRoom);

// @route   POST /api/rooms
// @desc    Tạo phòng chiếu mới
// @access  Private (Admin)
router.post('/', createRoom);

// @route   PUT /api/rooms/:id
// @desc    Cập nhật phòng chiếu
// @access  Private (Admin)
router.put('/:id', updateRoom);

// @route   DELETE /api/rooms/:id
// @desc    Xóa phòng chiếu
// @access  Private (Admin)
router.delete('/:id', deleteRoom);
// Thêm vào roomRoutes.js
router.get('/status/:status', getRoomsByStatus);

module.exports = router;