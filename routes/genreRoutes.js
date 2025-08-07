const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers
const {
  getGenres,
  getGenre,
  createGenre,
  updateGenre,
  deleteGenre,
  uploadGenreImage,
  getGenresForSelect,  // Thêm method này
  getGenreStatistics   // Thêm method này
} = require('../controllers/genreController');

// Routes công khai
router.route('/').get(getGenres);
router.route('/select').get(getGenresForSelect); // Để lấy danh sách cho dropdown
router.route('/statistics').get(getGenreStatistics); // Cho thống kê
router.route('/:id').get(getGenre);

// Routes cho admin - yêu cầu authentication
router.use(protect);
router.use(authorize('admin'));

router.route('/').post(createGenre);
router.route('/:id')
  .put(updateGenre)
  .delete(deleteGenre);

router.route('/:id/image').put(uploadGenreImage);

module.exports = router;