const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers (chúng ta sẽ tạo sau)
const {
  getGenres,
  getGenre,
  createGenre,
  updateGenre,
  deleteGenre,
  uploadGenreImage
} = require('../controllers/genreController');

// Routes công khai
router.route('/').get(getGenres);
router.route('/:id').get(getGenre);

// Routes cho admin
router.use(protect);
router.use(authorize('admin'));

router.route('/').post(createGenre);
router.route('/:id')
  .put(updateGenre)
  .delete(deleteGenre);

router.route('/:id/image').put(uploadGenreImage);

module.exports = router;