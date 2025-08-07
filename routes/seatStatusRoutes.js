// routes/seatStatusRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();

// Import controller functions
const {
  getSeatStatusForShowtime,
  reserveSeats,
  confirmBooking,
  cancelReservation,
  cleanupExpiredReservations,
  getSeatStatusStats,
  initializeSeatStatus
} = require('../controllers/seatStatusController');

// ✅ FIXED: Đổi endpoint để match với frontend
// @route   GET /api/seat-status/showtime/:showtimeId
// @desc    Lấy trạng thái ghế cho 1 showtime
// @access  Public
router.get('/showtime/:showtimeId', getSeatStatusForShowtime);

// @route   POST /api/seat-status/reserve
// @desc    Reserve ghế (giữ chỗ tạm thời)
// @access  Private
router.post('/reserve', reserveSeats);

// @route   POST /api/seat-status/confirm
// @desc    Confirm booking (chuyển từ reserved sang booked)
// @access  Private
router.post('/confirm', confirmBooking);

// @route   POST /api/seat-status/cancel
// @desc    Cancel reservation (từ reserved về available)
// @access  Private
router.post('/cancel', cancelReservation);

// @route   POST /api/seat-status/cleanup
// @desc    Cleanup expired reservations (dùng cho cron job)
// @access  Private (Admin)
router.post('/cleanup', cleanupExpiredReservations);

// @route   GET /api/seat-status/stats/:showtimeId
// @desc    Lấy thống kê seat status
// @access  Public
router.get('/stats/:showtimeId', getSeatStatusStats);

// @route   POST /api/seat-status/initialize/:showtimeId
// @desc    Khởi tạo seat status cho showtime (nếu chưa có)
// @access  Private (Admin)
router.post('/initialize/:showtimeId', initializeSeatStatus);

module.exports = router;