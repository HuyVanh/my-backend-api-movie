// routes/movieRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

const {
  getMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
  uploadMovieImage
  // searchMovies - Tạm thời bỏ
} = require('../controllers/movieController');

// Routes công khai
router.route('/').get(getMovies);
// router.route('/search').get(searchMovies); // Tạm thời comment
router.route('/:id').get(getMovie);

// Routes cho admin (cần authentication)
router.use(protect);
router.use(authorize('admin'));

router.route('/').post(createMovie);
router.route('/:id')
  .put(updateMovie)
  .delete(deleteMovie);

router.route('/:id/image').put(uploadMovieImage);

module.exports = router;