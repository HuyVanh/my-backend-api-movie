const Genre = require('../models/genreModel');

// @desc    Lấy tất cả thể loại
// @route   GET /api/genres
// @access  Public
exports.getGenres = async (req, res) => {
  try {
    const genres = await Genre.find();

    res.status(200).json({
      success: true,
      count: genres.length,
      data: genres
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết thể loại
// @route   GET /api/genres/:id
// @access  Public
exports.getGenre = async (req, res) => {
  try {
    const genre = await Genre.findById(req.params.id);

    if (!genre) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thể loại'
      });
    }

    res.status(200).json({
      success: true,
      data: genre
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Tạo thể loại mới
// @route   POST /api/genres
// @access  Private (Admin)
exports.createGenre = async (req, res) => {
  try {
    const genre = await Genre.create(req.body);

    res.status(201).json({
      success: true,
      data: genre
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật thể loại
// @route   PUT /api/genres/:id
// @access  Private (Admin)
exports.updateGenre = async (req, res) => {
  try {
    let genre = await Genre.findById(req.params.id);

    if (!genre) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thể loại'
      });
    }

    genre = await Genre.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: genre
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa thể loại
// @route   DELETE /api/genres/:id
// @access  Private (Admin)
exports.deleteGenre = async (req, res) => {
  try {
    const genre = await Genre.findById(req.params.id);

    if (!genre) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thể loại'
      });
    }

    await Genre.findByIdAndDelete(req.params.id);

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

// @desc    Upload ảnh cho thể loại
// @route   PUT /api/genres/:id/image
// @access  Private (Admin)
exports.uploadGenreImage = async (req, res) => {
  try {
    const genre = await Genre.findById(req.params.id);

    if (!genre) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thể loại'
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