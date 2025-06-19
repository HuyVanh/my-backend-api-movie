const Director = require('../models/directorModel');

// @desc    Lấy tất cả đạo diễn
// @route   GET /api/directors
// @access  Public
exports.getDirectors = async (req, res) => {
  try {
    const directors = await Director.find();

    res.status(200).json({
      success: true,
      count: directors.length,
      data: directors
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết đạo diễn
// @route   GET /api/directors/:id
// @access  Public
exports.getDirector = async (req, res) => {
  try {
    const director = await Director.findById(req.params.id);

    if (!director) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy đạo diễn'
      });
    }

    res.status(200).json({
      success: true,
      data: director
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Tạo đạo diễn mới
// @route   POST /api/directors
// @access  Private (Admin)
exports.createDirector = async (req, res) => {
  try {
    const director = await Director.create(req.body);

    res.status(201).json({
      success: true,
      data: director
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật đạo diễn
// @route   PUT /api/directors/:id
// @access  Private (Admin)
exports.updateDirector = async (req, res) => {
  try {
    let director = await Director.findById(req.params.id);

    if (!director) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy đạo diễn'
      });
    }

    director = await Director.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: director
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa đạo diễn
// @route   DELETE /api/directors/:id
// @access  Private (Admin)
exports.deleteDirector = async (req, res) => {
  try {
    const director = await Director.findById(req.params.id);

    if (!director) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy đạo diễn'
      });
    }

    await Director.findByIdAndDelete(req.params.id);

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

// @desc    Upload ảnh cho đạo diễn
// @route   PUT /api/directors/:id/image
// @access  Private (Admin)
exports.uploadDirectorImage = async (req, res) => {
  try {
    const director = await Director.findById(req.params.id);

    if (!director) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy đạo diễn'
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