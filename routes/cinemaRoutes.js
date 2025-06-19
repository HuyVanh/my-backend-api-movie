const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers (chúng ta sẽ tạo sau)
const {
  getCinemas,
  getCinema,
  createCinema,
  updateCinema,
  deleteCinema
} = require('../controllers/cinemaController');

// Routes công khai
router.route('/').get(getCinemas);
router.route('/:id').get(getCinema);

// Routes cho admin
router.use(protect);
router.use(authorize('admin'));

router.route('/').post(createCinema);
router.route('/:id')
  .put(updateCinema)
  .delete(deleteCinema);

module.exports = router;