// routes/statisticsRoutes.js
const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getRevenueStats, 
  getMovieStats,
  getUserStats,
  getDetailedStats,
  getShowtimeStats,
  debugStats,
  debugCinemaStats
} = require('../controllers/statisticsController');

const { protect, authorize } = require('../middleware/auth');

// Routes chính
router.get('/dashboard', protect, authorize('admin'), getDashboardStats);
router.get('/revenue', protect, authorize('admin'), getRevenueStats);
router.get('/movies', protect, authorize('admin'), getMovieStats);
router.get('/users', protect, authorize('admin'), getUserStats);
router.get('/detailed', protect, authorize('admin'), getDetailedStats);
router.get('/showtimes/:showtimeId', protect, authorize('admin'), getShowtimeStats);
// Trong routes/statisticsRoutes.js
router.get('/debug-cinema', protect, authorize('admin'), debugCinemaStats);

// Debug route
router.get('/debug', debugStats);

module.exports = router;