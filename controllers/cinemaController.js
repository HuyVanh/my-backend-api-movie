const Cinema = require('../models/cinemaModel');

// @desc    Lấy tất cả rạp phim
// @route   GET /api/cinemas
// @access  Public
exports.getCinemas = async (req, res) => {
  try {
    const cinemas = await Cinema.find();

    res.status(200).json({
      success: true,
      count: cinemas.length,
      data: cinemas
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết rạp phim
// @route   GET /api/cinemas/:id
// @access  Public
exports.getCinema = async (req, res) => {
  try {
    const cinema = await Cinema.findById(req.params.id);

    if (!cinema) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy rạp phim'
      });
    }

    res.status(200).json({
      success: true,
      data: cinema
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Thêm rạp phim mới
// @route   POST /api/cinemas
// @access  Private (Admin)
exports.createCinema = async (req, res) => {
  try {
    const cinema = await Cinema.create(req.body);

    res.status(201).json({
      success: true,
      data: cinema
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật rạp phim
// @route   PUT /api/cinemas/:id
// @access  Private (Admin)
exports.updateCinema = async (req, res) => {
  try {
    let cinema = await Cinema.findById(req.params.id);

    if (!cinema) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy rạp phim'
      });
    }

    cinema = await Cinema.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: cinema
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa rạp phim
// @route   DELETE /api/cinemas/:id
// @access  Private (Admin)
exports.deleteCinema = async (req, res) => {
  try {
    const cinema = await Cinema.findById(req.params.id);

    if (!cinema) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy rạp phim'
      });
    }

    await Cinema.findByIdAndDelete(req.params.id);

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