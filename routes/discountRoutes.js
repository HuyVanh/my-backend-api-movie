const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers (chúng ta sẽ tạo sau)
const {
  getDiscounts,
  getDiscount,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  verifyDiscount,
  getAllDiscountsForAdmin
} = require('../controllers/discountController');

// Routes công khai
router.route('/').get(getDiscounts);
router.route('/:id').get(getDiscount);
router.route('/verify/:code').get(verifyDiscount);

// Routes cho admin
router.use(protect);
router.use(authorize('admin'));

router.route('/admin/all').get(getAllDiscountsForAdmin);
router.route('/').post(createDiscount);
router.route('/:id')
  .put(updateDiscount)
  .delete(deleteDiscount);

module.exports = router;