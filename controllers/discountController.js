const Discount = require('../models/discountModel');

// @desc    Lấy tất cả mã giảm giá
// @route   GET /api/discounts
// @access  Public
exports.getDiscounts = async (req, res) => {
  try {
    const currentDate = new Date();
    const discounts = await Discount.find({
      status: 'active',
      dayStart: { $lte: currentDate },
      dayEnd: { $gte: currentDate }
    }).populate('cinema', 'name');

    res.status(200).json({
      success: true,
      count: discounts.length,
      data: discounts
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết mã giảm giá
// @route   GET /api/discounts/:id
// @access  Public
exports.getDiscount = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id).populate('cinema', 'name');

    if (!discount) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy mã giảm giá'
      });
    }

    res.status(200).json({
      success: true,
      data: discount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xác minh mã giảm giá
// @route   GET /api/discounts/verify/:code
// @access  Public
exports.verifyDiscount = async (req, res) => {
  try {
    const currentDate = new Date();
    const discount = await Discount.findOne({
      code: req.params.code,
      status: 'active',
      dayStart: { $lte: currentDate },
      dayEnd: { $gte: currentDate }
    });

    if (!discount) {
      return res.status(404).json({
        success: false,
        error: 'Mã giảm giá không hợp lệ hoặc đã hết hạn'
      });
    }

    res.status(200).json({
      success: true,
      data: discount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Tạo mã giảm giá mới
// @route   POST /api/discounts
// @access  Private (Admin)
exports.createDiscount = async (req, res) => {
  try {
    const discount = await Discount.create(req.body);

    res.status(201).json({
      success: true,
      data: discount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật mã giảm giá
// @route   PUT /api/discounts/:id
// @access  Private (Admin)
exports.updateDiscount = async (req, res) => {
  try {
    let discount = await Discount.findById(req.params.id);

    if (!discount) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy mã giảm giá'
      });
    }

    discount = await Discount.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: discount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa mã giảm giá
// @route   DELETE /api/discounts/:id
// @access  Private (Admin)
exports.deleteDiscount = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);

    if (!discount) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy mã giảm giá'
      });
    }

    await Discount.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};