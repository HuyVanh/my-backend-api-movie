const ShowTime = require('../models/showTimeModel');

// @desc    Lấy tất cả thời gian chiếu
// @route   GET /api/showtimes
// @access  Public
exports.getShowtimes = async (req, res) => {
  try {
    const showtimes = await ShowTime.find().sort('time');

    res.status(200).json({
      success: true,
      count: showtimes.length,
      data: showtimes
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết thời gian chiếu
// @route   GET /api/showtimes/:id
// @access  Public
exports.getShowtime = async (req, res) => {
  try {
    const showtime = await ShowTime.findById(req.params.id);

    if (!showtime) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thời gian chiếu'
      });
    }

    res.status(200).json({
      success: true,
      data: showtime
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Tạo thời gian chiếu mới
// @route   POST /api/showtimes
// @access  Private (Admin)
exports.createShowtime = async (req, res) => {
  try {
    const showtime = await ShowTime.create(req.body);

    res.status(201).json({
      success: true,
      data: showtime
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật thời gian chiếu
// @route   PUT /api/showtimes/:id
// @access  Private (Admin)
exports.updateShowtime = async (req, res) => {
  try {
    let showtime = await ShowTime.findById(req.params.id);

    if (!showtime) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thời gian chiếu'
      });
    }

    showtime = await ShowTime.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: showtime
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa thời gian chiếu
// @route   DELETE /api/showtimes/:id
// @access  Private (Admin)
exports.deleteShowtime = async (req, res) => {
  try {
    const showtime = await ShowTime.findById(req.params.id);

    if (!showtime) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thời gian chiếu'
      });
    }

    await ShowTime.findByIdAndDelete(req.params.id);

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