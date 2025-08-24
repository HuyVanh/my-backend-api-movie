const Movie = require('../models/movieModel');
const Director = require('../models/directorModel');
const Actor = require('../models/actorModel');
const Genre = require('../models/genreModel');
const multer = require('multer');
const path = require('path');

// @desc    Lấy tất cả phim
// @route   GET /api/movies
// @access  Public
exports.getMovies = async (req, res) => {
  try {
    let query;
    const reqQuery = { ...req.query };
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    // ✅ THÊM FILTER CHỈ LẤY PHIM ACTIVE
    reqQuery.status = 'active'; // Chỉ lấy phim đang chiếu

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    query = Movie.find(JSON.parse(queryStr))
      .populate('director', 'name')
      .populate('actor', 'name')
      .populate('genre', 'name');

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-release_date');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    // ✅ SỬA: Đếm theo điều kiện có status = 'active'
    const total = await Movie.countDocuments({ status: 'active' });

    query = query.skip(startIndex).limit(limit);

    const movies = await query;

    const pagination = {};
    if (endIndex < total) {
      pagination.next = { page: page + 1, limit };
    }
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
      success: true,
      count: movies.length,
      pagination,
      data: movies
    });
  } catch (err) {
    console.error('Error in getMovies:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};
// ✅ THÊM METHOD MỊI: Lấy tất cả phim cho Admin (bao gồm cả inactive)
// @desc    Lấy tất cả phim cho Admin
// @route   GET /api/movies/admin/all  
// @access  Private (Admin)
exports.getAllMoviesForAdmin = async (req, res) => {
  try {
    let query;
    const reqQuery = { ...req.query };
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    // ✅ KHÔNG FILTER theo status - lấy tất cả phim

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    query = Movie.find(JSON.parse(queryStr))
      .populate('director', 'name')
      .populate('actor', 'name')
      .populate('genre', 'name');

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-release_date');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Movie.countDocuments();

    query = query.skip(startIndex).limit(limit);

    const movies = await query;

    // ✅ THÊM THỐNG KÊ CHO ADMIN
    const statistics = {
      total: movies.length,
      active: movies.filter(m => m.status === 'active').length,
      inactive: movies.filter(m => m.status === 'inactive').length
    };

    const pagination = {};
    if (endIndex < total) {
      pagination.next = { page: page + 1, limit };
    }
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
      success: true,
      count: movies.length,
      pagination,
      statistics,
      data: movies
    });
  } catch (err) {
    console.error('Error in getAllMoviesForAdmin:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết phim
// @route   GET /api/movies/:id
// @access  Public
exports.getMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id)
      .populate('director', 'name image')
      .populate('actor', 'name image')
      .populate('genre', 'name');

    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy phim'
      });
    }

    res.status(200).json({
      success: true,
      data: movie
    });
  } catch (err) {
    console.error('Error in getMovie:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Thêm phim mới
// @route   POST /api/movies
// @access  Private (Admin)
exports.createMovie = async (req, res) => {
  try {
    // 🐛 DEBUG: Log dữ liệu nhận được
    console.log('=== CREATE MOVIE DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Language received:', req.body.language);
    console.log('Language type:', typeof req.body.language);
    console.log('Language length:', req.body.language?.length);
    
    // 🔧 CLEAN & VALIDATE: Làm sạch dữ liệu đầu vào
    const movieData = { ...req.body };
    
    // Làm sạch language field
    if (movieData.language) {
      movieData.language = movieData.language.toString().trim();
      console.log('Cleaned language:', movieData.language);
    }

    // Kiểm tra và validate director nếu có
    if (movieData.director && Array.isArray(movieData.director)) {
      const directorIds = movieData.director.filter(id => id); // Loại bỏ empty values
      if (directorIds.length > 0) {
        const existingDirectors = await Director.find({ _id: { $in: directorIds } });
        if (existingDirectors.length !== directorIds.length) {
          return res.status(400).json({
            success: false,
            error: 'Một hoặc nhiều Director không tồn tại'
          });
        }
      }
      movieData.director = directorIds;
    } else if (movieData.director && !Array.isArray(movieData.director)) {
      // Nếu chỉ có 1 director được gửi dưới dạng string
      const director = await Director.findById(movieData.director);
      if (!director) {
        return res.status(400).json({
          success: false,
          error: 'Director không tồn tại'
        });
      }
      movieData.director = [movieData.director];
    }

    // Kiểm tra và validate actor nếu có
    if (movieData.actor && Array.isArray(movieData.actor)) {
      const actorIds = movieData.actor.filter(id => id); // Loại bỏ empty values
      if (actorIds.length > 0) {
        const existingActors = await Actor.find({ _id: { $in: actorIds } });
        if (existingActors.length !== actorIds.length) {
          return res.status(400).json({
            success: false,
            error: 'Một hoặc nhiều Actor không tồn tại'
          });
        }
      }
      movieData.actor = actorIds;
    } else if (movieData.actor && !Array.isArray(movieData.actor)) {
      // Nếu chỉ có 1 actor được gửi dưới dạng string
      const actor = await Actor.findById(movieData.actor);
      if (!actor) {
        return res.status(400).json({
          success: false,
          error: 'Actor không tồn tại'
        });
      }
      movieData.actor = [movieData.actor];
    }

    // Kiểm tra và validate genre nếu có
    if (movieData.genre && Array.isArray(movieData.genre)) {
      const genreIds = movieData.genre.filter(id => id); // Loại bỏ empty values
      if (genreIds.length > 0) {
        const existingGenres = await Genre.find({ _id: { $in: genreIds } });
        if (existingGenres.length !== genreIds.length) {
          return res.status(400).json({
            success: false,
            error: 'Một hoặc nhiều Genre không tồn tại'
          });
        }
      }
      movieData.genre = genreIds;
    } else if (movieData.genre && !Array.isArray(movieData.genre)) {
      // Nếu chỉ có 1 genre được gửi dưới dạng string
      const genre = await Genre.findById(movieData.genre);
      if (!genre) {
        return res.status(400).json({
          success: false,
          error: 'Genre không tồn tại'
        });
      }
      movieData.genre = [movieData.genre];
    }

    console.log('Final movie data before save:', JSON.stringify(movieData, null, 2));

    // Tạo movie mới
    const movie = await Movie.create(movieData);
    
    console.log('Movie created successfully:', movie._id);

    // Populate các references để trả về đầy đủ thông tin
    const populatedMovie = await Movie.findById(movie._id)
      .populate('director', 'name image')
      .populate('actor', 'name image')
      .populate('genre', 'name');

    res.status(201).json({
      success: true,
      data: populatedMovie
    });
    
  } catch (err) {
    console.error('=== CREATE MOVIE ERROR ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    // Kiểm tra lỗi validation
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }
    
    // Kiểm tra lỗi duplicate key
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field} đã tồn tại`
      });
    }

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi tạo phim'
    });
  }
};

// @desc    Cập nhật phim
// @route   PUT /api/movies/:id
// @access  Private (Admin)
exports.updateMovie = async (req, res) => {
  try {
    let movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy phim'
      });
    }

    // Làm sạch dữ liệu đầu vào
    const updateData = { ...req.body };
    if (updateData.language) {
      updateData.language = updateData.language.toString().trim();
    }

    movie = await Movie.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('director', 'name image')
      .populate('actor', 'name image')
      .populate('genre', 'name');

    res.status(200).json({
      success: true,
      data: movie
    });
  } catch (err) {
    console.error('Error in updateMovie:', err.message);
    
    // Kiểm tra lỗi validation
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa phim
// @route   DELETE /api/movies/:id
// @access  Private (Admin)
exports.deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy phim'
      });
    }

    await Movie.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error('Error in deleteMovie:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Upload ảnh cho phim
// @route   PUT /api/movies/:id/image
// @access  Private (Admin)
exports.uploadMovieImage = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy phim'
      });
    }

    // Logic upload file tại đây (sử dụng multer)
    res.status(200).json({
      success: true,
      data: 'Ảnh đã được upload thành công'
    });
  } catch (err) {
    console.error('Error in uploadMovieImage:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};