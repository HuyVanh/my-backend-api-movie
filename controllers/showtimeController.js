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

// @desc    Tạo thời gian chiếu tự động cho nhiều ngày
// @route   POST /api/showtimes/generate
// @access  Private (Admin)
exports.generateShowtimes = async (req, res) => {
  try {
    const { startDate, endDate, times, excludeDates = [] } = req.body;

    // Validate input
    if (!startDate || !endDate || !times || !Array.isArray(times)) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp startDate, endDate và times'
      });
    }

    if (times.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Danh sách thời gian không được rỗng'
      });
    }

    const showtimes = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (currentDate > end) {
      return res.status(400).json({
        success: false,
        error: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc'
      });
    }

    // Generate showtimes
    while (currentDate <= end) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Skip excluded dates
      if (!excludeDates.includes(dateString)) {
        times.forEach(time => {
          showtimes.push({
            time: time,
            date: dateString
          });
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Check for duplicates before creating
    const existingShowtimes = await ShowTime.find({
      date: { $gte: startDate, $lte: endDate }
    });

    const duplicates = [];
    const newShowtimes = showtimes.filter(showtime => {
      const isDuplicate = existingShowtimes.some(existing => 
        existing.date === showtime.date && existing.time === showtime.time
      );
      if (isDuplicate) {
        duplicates.push(`${showtime.date} ${showtime.time}`);
      }
      return !isDuplicate;
    });

    if (newShowtimes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tất cả thời gian chiếu đã tồn tại',
        duplicates: duplicates
      });
    }

    // Create new showtimes
    const createdShowtimes = await ShowTime.insertMany(newShowtimes);

    res.status(201).json({
      success: true,
      message: `Đã tạo ${createdShowtimes.length} thời gian chiếu`,
      data: {
        created: createdShowtimes.length,
        duplicatesSkipped: duplicates.length,
        duplicates: duplicates,
        showtimes: createdShowtimes
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

// @desc    Xóa thời gian chiếu theo khoảng ngày
// @route   DELETE /api/showtimes/bulk
// @access  Private (Admin)
exports.deleteShowtimesByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp startDate và endDate'
      });
    }

    const result = await ShowTime.deleteMany({
      date: { $gte: startDate, $lte: endDate }
    });

    res.status(200).json({
      success: true,
      message: `Đã xóa ${result.deletedCount} thời gian chiếu`,
      deletedCount: result.deletedCount
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};