const mongoose = require('mongoose');
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
    // Chỉ lấy các trường hợp lệ từ request body
    const { name, image } = req.body;
    const directorData = { name };
    
    if (image) {
      directorData.image = image;
    }
    
    const director = await Director.create(directorData);

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

    // Chỉ lấy các trường hợp lệ từ request body
    const { name, image } = req.body;
    const updateData = {};
    
    if (name) updateData.name = name;
    if (image !== undefined) updateData.image = image;

    director = await Director.findByIdAndUpdate(req.params.id, updateData, {
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
    // Sau khi upload, cập nhật trường image trong database
    
    director.image = req.imageUrl; // Giả sử req.imageUrl chứa URL của ảnh sau khi upload
    await director.save();

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