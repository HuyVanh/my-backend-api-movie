const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers
const {
  getDiscounts,
  getDiscount,
  createDiscount,
  updateDiscount,
  updateDiscountStatus,
  deleteDiscount,
  verifyDiscount,
  getAllDiscountsForAdmin
} = require('../controllers/discountController');

// Routes công khai (cho users)
router.route('/').get(getDiscounts); // Chỉ lấy active và còn hạn
router.route('/:id').get(getDiscount);
router.route('/verify/:code').get(verifyDiscount);

// Routes cho admin - yêu cầu authentication
router.use(protect);
router.use(authorize('admin'));

// ✅ QUAN TRỌNG: Route này phải đặt TRƯỚC route /:id
router.route('/admin/all').get(getAllDiscountsForAdmin); // Lấy TẤT CẢ discounts
router.route('/').post(createDiscount);
router.route('/:id')
  .put(updateDiscount)
  .delete(deleteDiscount);

// ✅ THÊM: Route riêng để update status
router.route('/:id/status').patch(updateDiscountStatus);

module.exports = router;