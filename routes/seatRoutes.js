// routes/seatRoutes.js - VERSION CẬP NHẬT
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
  deleteAllSeatsInRoom,
  // ✅ THÊM CÁC FUNCTION MỚI
  validateSeatsAvailability,
  getSeatStatusByShowtime,
  getSeatStats
} = require('../controllers/seatController');

// ✅ THÊM ENDPOINT VALIDATE-AVAILABILITY - PHẢI ĐẶT TRƯỚC CÁC ROUTE KHÁC
// @route   POST /api/seats/validate-availability
// @desc    Kiểm tra ghế có khả dụng cho suất chiếu không
// @access  Public
router.post('/validate-availability', validateSeatsAvailability);

// @route   GET /api/seats/status/:showtimeId
// @desc    Lấy trạng thái ghế cho suất chiếu
// @access  Public
router.get('/status/:showtimeId', getSeatStatusByShowtime);

// @route   GET /api/seats/stats/:roomId
// @desc    Thống kê ghế trong phòng
// @access  Public
router.get('/stats/:roomId', getSeatStats);

// @route   GET /api/seats
// @desc    Lấy tất cả ghế
// @access  Public
router.get('/', getSeats);

// @route   GET /api/seats/room/:roomId
// @desc    Lấy ghế theo phòng
// @access  Public
router.get('/room/:roomId', getSeatsByRoom);

// @route   POST /api/seats/bulk
// @desc    Tạo nhiều ghế cùng lúc
// @access  Private
router.post('/bulk', createBulkSeats);

// @route   POST /api/seats/auto-generate/:roomId
// @desc    Tạo ghế tự động cho phòng theo pattern
// @access  Private
router.post('/auto-generate/:roomId', autoGenerateSeats);

// @route   POST /api/seats
// @desc    Tạo ghế mới
// @access  Private
router.post('/', createSeat);

// @route   GET /api/seats/:id
// @desc    Lấy ghế theo ID
// @access  Public
router.get('/:id', getSeat);

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