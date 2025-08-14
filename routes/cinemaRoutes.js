const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers
const {
  getCinemas,
  getCinema,
  createCinema,
  updateCinema,
  deleteCinema,
  toggleCinemaStatus,
  getAllCinemasForAdmin,
  getCinemaStatistics
} = require('../controllers/cinemaController');

// ============ ROUTES CÔNG KHAI (CHO MOBILE APP) ============
// Chỉ trả về rạp isActive: true
router.route('/').get(getCinemas);
router.route('/:id').get(getCinema);

// ============ ROUTES CHO ADMIN (CẦN AUTHENTICATION) ============
router.use(protect);
router.use(authorize('admin'));

// Routes đặc biệt cho admin
router.route('/admin/all').get(getAllCinemasForAdmin);
router.route('/admin/statistics').get(getCinemaStatistics);

// CRUD operations
router.route('/').post(createCinema);
router.route('/:id')
  .put(updateCinema)
  .delete(deleteCinema);

// Toggle status
router.route('/:id/toggle-status').put(toggleCinemaStatus);

module.exports = router;