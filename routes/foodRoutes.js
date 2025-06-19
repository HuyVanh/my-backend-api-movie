const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers (chúng ta sẽ tạo sau)
const {
  getFoods,
  getFood,
  createFood,
  updateFood,
  deleteFood,
  uploadFoodImage
} = require('../controllers/foodController');

// Routes công khai
router.route('/').get(getFoods);
router.route('/:id').get(getFood);

// Routes cho admin
router.use(protect);
router.use(authorize('admin'));

router.route('/').post(createFood);
router.route('/:id')
  .put(updateFood)
  .delete(deleteFood);

router.route('/:id/image').put(uploadFoodImage);

module.exports = router;