// Trong file foodRoutes.js hiện tại của bạn

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers - THÊM 2 functions mới
const {
  getFoods,
  getFood,
  createFood,
  updateFood,
  deleteFood,
  uploadFoodImage,
  getAllFoods,        // ← THÊM function mới
  updateFoodStatus    // ← THÊM function mới
} = require('../controllers/foodController');

// Routes công khai (giữ nguyên)
router.route('/').get(getFoods);
router.route('/:id').get(getFood);

// Routes cho admin (giữ nguyên)
router.use(protect);
router.use(authorize('admin'));

router.route('/').post(createFood);
router.route('/:id')
  .put(updateFood)
  .delete(deleteFood);

router.route('/:id/image').put(uploadFoodImage);

// ← CHỈ THÊM 2 ROUTES MỚI:
router.route('/admin/all').get(getAllFoods);      // Lấy tất cả món cho admin
router.route('/:id/status').put(updateFoodStatus); // Cập nhật status

module.exports = router;