// routes/showTimeRoutes.js
const express = require('express');
const router = express.Router();

// Import controller functions
const {
  getShowtimes,
  getShowtime,
  createShowtime,
  updateShowtime,
  deleteShowtime,
  getShowtimesByMovie,
  getShowtimesByRoom,
  getShowtimesByDate,
  generateShowtimes,
  deleteShowtimesByDateRange
} = require('../controllers/showtimeController');

// @route   GET /api/showtimes
// @desc    Lấy tất cả thời gian chiếu
// @access  Public
router.get('/', getShowtimes);

// @route   GET /api/showtimes/movie/:movieId
// @desc    Lấy thời gian chiếu theo phim
// @access  Public
router.get('/movie/:movieId', getShowtimesByMovie);

// @route   GET /api/showtimes/room/:roomId
// @desc    Lấy thời gian chiếu theo phòng
// @access  Public
router.get('/room/:roomId', getShowtimesByRoom);

// @route   GET /api/showtimes/date/:date
// @desc    Lấy thời gian chiếu theo ngày
// @access  Public
router.get('/date/:date', getShowtimesByDate);

// @route   GET /api/showtimes/:id
// @desc    Lấy chi tiết thời gian chiếu
// @access  Public
router.get('/:id', getShowtime);

// @route   POST /api/showtimes
// @desc    Tạo thời gian chiếu mới
// @access  Private (Admin)
router.post('/', createShowtime);

// @route   POST /api/showtimes/generate
// @desc    Tạo thời gian chiếu tự động cho nhiều ngày
// @access  Private (Admin)
router.post('/generate', generateShowtimes);

// @route   PUT /api/showtimes/:id
// @desc    Cập nhật thời gian chiếu
// @access  Private (Admin)
router.put('/:id', updateShowtime);

// @route   DELETE /api/showtimes/:id
// @desc    Xóa thời gian chiếu
// @access  Private (Admin)
router.delete('/:id', deleteShowtime);

// @route   DELETE /api/showtimes/bulk
// @desc    Xóa thời gian chiếu theo khoảng ngày
// @access  Private (Admin)
router.delete('/bulk', deleteShowtimesByDateRange);

module.exports = router;