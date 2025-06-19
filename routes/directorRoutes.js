const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers (chúng ta sẽ tạo sau)
const {
  getDirectors,
  getDirector,
  createDirector,
  updateDirector,
  deleteDirector,
  uploadDirectorImage
} = require('../controllers/directorController');

// Routes công khai
router.route('/').get(getDirectors);
router.route('/:id').get(getDirector);

// Routes cho admin
router.use(protect);
router.use(authorize('admin'));

router.route('/').post(createDirector);
router.route('/:id')
  .put(updateDirector)
  .delete(deleteDirector);

router.route('/:id/image').put(uploadDirectorImage);

module.exports = router;