// routes/seatRoutes.js
const express = require('express');
const router = express.Router();

// Import controller functions
const {
  getSeats,
  getSeat,
  getSeatsByRoom,
  createSeat,
  updateSeat,
  deleteSeat,
  createBulkSeats,
  autoGenerateSeats,
  deleteAllSeatsInRoom
} = require('../controllers/seatController');

// @route   GET /api/seats
// @desc    Lấy tất cả ghế
// @access  Public
router.get('/', getSeats);

// @route   GET /api/seats/room/:roomId
// @desc    Lấy ghế theo phòng
// @access  Public
router.get('/room/:roomId', getSeatsByRoom);

// @route   GET /api/seats/:id
// @desc    Lấy ghế theo ID
// @access  Public
router.get('/:id', getSeat);

// @route   POST /api/seats
// @desc    Tạo ghế mới
// @access  Private
router.post('/', createSeat);

// @route   POST /api/seats/bulk
// @desc    Tạo nhiều ghế cùng lúc
// @access  Private
router.post('/bulk', createBulkSeats);

// @route   POST /api/seats/auto-generate/:roomId
// @desc    Tạo ghế tự động cho phòng theo pattern
// @access  Private
router.post('/auto-generate/:roomId', autoGenerateSeats);

// @route   PUT /api/seats/:id
// @desc    Cập nhật ghế
// @access  Private
router.put('/:id', updateSeat);

// @route   DELETE /api/seats/:id
// @desc    Xóa ghế
// @access  Private
router.delete('/:id', deleteSeat);

// @route   DELETE /api/seats/room/:roomId
// @desc    Xóa tất cả ghế trong phòng
// @access  Private
router.delete('/room/:roomId', deleteAllSeatsInRoom);

module.exports = router;