const Food = require('../models/foodModel');

// @desc    Lấy tất cả đồ ăn/uống
// @route   GET /api/foods
// @access  Public
exports.getFoods = async (req, res) => {
  try {
    const foods = await Food.find({ status: 'available' });

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết đồ ăn/uống
// @route   GET /api/foods/:id
// @access  Public
exports.getFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy sản phẩm'
      });
    }

    res.status(200).json({
      success: true,
      data: food
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Tạo đồ ăn/uống mới
// @route   POST /api/foods
// @access  Private (Admin)
exports.createFood = async (req, res) => {
  try {
    const food = await Food.create(req.body);

    res.status(201).json({
      success: true,
      data: food
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật đồ ăn/uống
// @route   PUT /api/foods/:id
// @access  Private (Admin)
exports.updateFood = async (req, res) => {
  try {
    let food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy sản phẩm'
      });
    }

    food = await Food.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: food
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa đồ ăn/uống
// @route   DELETE /api/foods/:id
// @access  Private (Admin)
exports.deleteFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy sản phẩm'
      });
    }

    await Food.findByIdAndDelete(req.params.id);

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

// @desc    Upload ảnh cho đồ ăn/uống
// @route   PUT /api/foods/:id/image
// @access  Private (Admin)
exports.uploadFoodImage = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy sản phẩm'
      });
    }

    // Logic upload file tại đây
    res.status(200).json({
      success: true,
      data: 'Ảnh đã được upload thành công'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};
// THÊM 2 functions này vào cuối file foodController.js hiện tại của bạn

// @desc    Lấy TẤT CẢ đồ ăn/uống (cả available và unavailable) - ADMIN ONLY
// @route   GET /api/foods/admin/all
// @access  Private (Admin)
exports.getAllFoods = async (req, res) => {
  try {
    const foods = await Food.find({});

    const availableCount = foods.filter(food => food.status === 'available').length;
    const unavailableCount = foods.filter(food => food.status === 'unavailable').length;

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods,
      summary: {
        total: foods.length,
        available: availableCount,
        unavailable: unavailableCount
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật STATUS đồ ăn/uống (available/unavailable)
// @route   PUT /api/foods/:id/status
// @access  Private (Admin)
exports.updateFoodStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['available', 'unavailable'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Trạng thái phải là "available" hoặc "unavailable"'
      });
    }

    let food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy sản phẩm'
      });
    }

    food = await Food.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true, runValidators: true }
    );

    const statusText = status === 'available' ? 'kích hoạt (hiển thị trên app)' : 'vô hiệu hóa (ẩn khỏi app)';

    res.status(200).json({
      success: true,
      data: food,
      message: `Đã ${statusText} món ăn "${food.name}"`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};