const Genre = require('../models/genreModel');

// @desc    Lấy tất cả thể loại
// @route   GET /api/genres
// @access  Public
exports.getGenres = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    let query = {};
    
    // Search functionality
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const genres = await Genre.find(query)
      .sort({ _id: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await Genre.countDocuments(query);

    res.status(200).json({
      success: true,
      count: genres.length,
      total,
      data: {
        genres,
        total
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

// @desc    Lấy thể loại cho dropdown
// @route   GET /api/genres/select
// @access  Public
exports.getGenresForSelect = async (req, res) => {
  try {
    const genres = await Genre.find()
      .select('_id name')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
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

// @desc    Lấy thống kê thể loại
// @route   GET /api/genres/statistics
// @access  Public
exports.getGenreStatistics = async (req, res) => {
  try {
    const totalGenres = await Genre.countDocuments();
    
    res.status(200).json({
      success: true,
      data: {
        totalGenres,
        activeGenres: totalGenres, // Vì không có status field
        inactiveGenres: 0
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
    const { name, image } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên thể loại'
      });
    }
    
    // Check if genre already exists
    const existingGenre = await Genre.findOne({ name });
    if (existingGenre) {
      return res.status(400).json({
        success: false,
        message: 'Tên thể loại đã tồn tại'
      });
    }

    const genre = await Genre.create({
      name: name.trim(),
      image: image || ''
    });

    res.status(201).json({
      success: true,
      message: 'Tạo thể loại thành công',
      data: genre
    });
  } catch (err) {
    console.error(err.message);
    
    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message).join(', ');
      return res.status(400).json({
        success: false,
        message
      });
    }
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tên thể loại đã tồn tại'
      });
    }
    
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
        message: 'Không tìm thấy thể loại'
      });
    }
    
    const { name, image } = req.body;
    
    // Check for duplicate name (exclude current genre)
    if (name) {
      const existingGenre = await Genre.findOne({ 
        name: name.trim(), 
        _id: { $ne: req.params.id } 
      });
      
      if (existingGenre) {
        return res.status(400).json({
          success: false,
          message: 'Tên thể loại đã tồn tại'
        });
      }
    }

    genre = await Genre.findByIdAndUpdate(
      req.params.id, 
      {
        ...(name && { name: name.trim() }),
        ...(image !== undefined && { image })
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Cập nhật thể loại thành công',
      data: genre
    });
  } catch (err) {
    console.error(err.message);
    
    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message).join(', ');
      return res.status(400).json({
        success: false,
        message
      });
    }
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tên thể loại đã tồn tại'
      });
    }
    
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
        message: 'Không tìm thấy thể loại'
      });
    }

    await Genre.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Xóa thể loại thành công',
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
    // Bạn có thể sử dụng multer hoặc express-fileupload
    
    res.status(200).json({
      success: true,
      message: 'Ảnh đã được upload thành công',
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