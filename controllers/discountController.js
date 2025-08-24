const Discount = require('../models/discountModel');

// @desc    Lấy tất cả mã giảm giá (cho public - chỉ active và còn hạn)
// @route   GET /api/discounts
// @access  Public
exports.getDiscounts = async (req, res) => {
  try {
    const currentDate = new Date();
    const discounts = await Discount.find({
      status: 'active',
      dayStart: { $lte: currentDate },
      dayEnd: { $gte: currentDate }
    }).populate('cinema', 'name isActive');

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

// @desc    Lấy TẤT CẢ mã giảm giá cho Admin (bao gồm inactive)
// @route   GET /api/discounts/admin/all
// @access  Private (Admin)
exports.getAllDiscountsForAdmin = async (req, res) => {
  try {
    // ✅ QUAN TRỌNG: Không filter theo status, lấy tất cả
    const discounts = await Discount.find({})
      .populate('cinema', 'name isActive')
      .sort({ createdAt: -1 }); // Sắp xếp theo thời gian tạo mới nhất

    res.status(200).json({
      success: true,
      count: discounts.length,
      data: discounts
    });
  } catch (err) {
    console.error('Error in getAllDiscountsForAdmin:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy danh sách khuyến mãi'
    });
  }
};

// @desc    Lấy chi tiết mã giảm giá
// @route   GET /api/discounts/:id
// @access  Public
exports.getDiscount = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id)
      .populate('cinema', 'name isActive');

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
      code: req.params.code.toUpperCase(), // Đảm bảo case-insensitive
      status: 'active',
      dayStart: { $lte: currentDate },
      dayEnd: { $gte: currentDate }
    }).populate('cinema', 'name isActive');

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
    // Đảm bảo code được viết hoa
    if (req.body.code) {
      req.body.code = req.body.code.toUpperCase();
    }

    const discount = await Discount.create(req.body);
    
    // Populate cinema info trước khi trả về
    const populatedDiscount = await Discount.findById(discount._id)
      .populate('cinema', 'name isActive');

    res.status(201).json({
      success: true,
      data: populatedDiscount
    });
  } catch (err) {
    console.error('Error in createDiscount:', err.message);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Mã khuyến mãi đã tồn tại'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi tạo khuyến mãi'
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

    // Đảm bảo code được viết hoa nếu có cập nhật
    if (req.body.code) {
      req.body.code = req.body.code.toUpperCase();
    }

    // ✅ QUAN TRỌNG: Cập nhật với populate ngay lập tức
    discount = await Discount.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      {
        new: true,
        runValidators: true
      }
    ).populate('cinema', 'name isActive');

    res.status(200).json({
      success: true,
      data: discount
    });
  } catch (err) {
    console.error('Error in updateDiscount:', err.message);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Mã khuyến mãi đã tồn tại'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật khuyến mãi'
    });
  }
};

// @desc    Cập nhật trạng thái mã giảm giá (riêng biệt)
// @route   PATCH /api/discounts/:id/status
// @access  Private (Admin)
exports.updateDiscountStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Trạng thái không hợp lệ'
      });
    }

    let discount = await Discount.findById(req.params.id);

    if (!discount) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy mã giảm giá'
      });
    }

    // Cập nhật chỉ trạng thái
    discount = await Discount.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true, runValidators: true }
    ).populate('cinema', 'name isActive');

    res.status(200).json({
      success: true,
      data: discount,
      message: `Đã ${status === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} mã khuyến mãi`
    });
  } catch (err) {
    console.error('Error in updateDiscountStatus:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật trạng thái'
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
      data: {},
      message: 'Đã xóa mã khuyến mãi thành công'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xóa khuyến mãi'
    });
  }
};