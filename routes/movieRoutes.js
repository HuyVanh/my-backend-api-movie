// routes/movieRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

const {
  getMovies,           // Public - chỉ phim active
  getAllMoviesForAdmin, // ✅ THÊM MỚI - Admin - tất cả phim
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
  uploadMovieImage
} = require('../controllers/movieController');

// Routes công khai - CHỈ PHIM ACTIVE
router.route('/').get(getMovies);
router.route('/:id').get(getMovie);

// Routes cho admin (cần authentication)
router.use(protect);
router.use(authorize('admin'));

// ✅ THÊM ROUTE MỚI cho admin
router.route('/admin/all').get(getAllMoviesForAdmin);

router.route('/').post(createMovie);
router.route('/:id')
  .put(updateMovie)
  .delete(deleteMovie);

router.route('/:id/image').put(uploadMovieImage);

module.exports = router;