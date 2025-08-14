const Cinema = require('../models/cinemaModel');

// @desc    Lấy rạp phim cho người dùng (chỉ rạp hoạt động)
// @route   GET /api/cinemas
// @access  Public
exports.getCinemas = async (req, res) => {
  try {
    // ✅ Chỉ lấy rạp đang hoạt động cho người dùng mobile
    const cinemas = await Cinema.find({ isActive: true });

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

// @desc    Lấy tất cả rạp phim cho admin (bao gồm cả rạp tạm ngưng)
// @route   GET /api/cinemas/admin/all
// @access  Private (Admin)
exports.getAllCinemasForAdmin = async (req, res) => {
  try {
    // ✅ Lấy TẤT CẢ rạp cho admin quản lý
    const cinemas = await Cinema.find({});

    const activeCount = cinemas.filter(c => c.isActive).length;
    const inactiveCount = cinemas.length - activeCount;

    res.status(200).json({
      success: true,
      count: cinemas.length,
      data: cinemas,
      statistics: {
        total: cinemas.length,
        active: activeCount,
        inactive: inactiveCount
      },
      message: `Đã tải ${cinemas.length} rạp phim (${activeCount} hoạt động, ${inactiveCount} tạm ngưng)`
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
    // ✅ Mặc định isActive = true khi tạo mới
    const cinemaData = {
      ...req.body,
      isActive: true
    };

    const cinema = await Cinema.create(cinemaData);

    res.status(201).json({
      success: true,
      data: cinema,
      message: `Đã thêm rạp "${cinema.name}" thành công`
    });
  } catch (err) {
    console.error('Create cinema error:', err.message);
    
    // Xử lý lỗi validation
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi tạo rạp phim'
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
      data: cinema,
      message: `Đã cập nhật rạp "${cinema.name}" thành công`
    });
  } catch (err) {
    console.error('Update cinema error:', err.message);
    
    // Xử lý lỗi validation
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật rạp phim'
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

    const cinemaName = cinema.name;
    await Cinema.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
      message: `Đã xóa rạp "${cinemaName}" thành công`
    });
  } catch (err) {
    console.error('Delete cinema error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xóa rạp phim'
    });
  }
};

// @desc    Toggle trạng thái hoạt động của rạp phim
// @route   PUT /api/cinemas/:id/toggle-status
// @access  Private (Admin)
exports.toggleCinemaStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Tìm cinema hiện tại
    const cinema = await Cinema.findById(id);
    
    if (!cinema) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy rạp phim'
      });
    }

    // Toggle trạng thái (đảo ngược isActive)
    const newStatus = !cinema.isActive;
    const updatedCinema = await Cinema.findByIdAndUpdate(
      id,
      { isActive: newStatus },
      { new: true, runValidators: true }
    );

    const statusText = updatedCinema.isActive ? 'kích hoạt' : 'tạm ngưng';
    const actionText = updatedCinema.isActive ? 
      'Người dùng có thể chọn rạp này' : 
      'Người dùng sẽ không thấy rạp này';
    
    res.status(200).json({
      success: true,
      data: updatedCinema,
      message: `Đã ${statusText} rạp "${updatedCinema.name}". ${actionText}.`
    });

  } catch (err) {
    console.error('Toggle cinema status error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi thay đổi trạng thái rạp'
    });
  }
};

// @desc    Lấy thống kê rạp phim
// @route   GET /api/cinemas/admin/statistics
// @access  Private (Admin)
exports.getCinemaStatistics = async (req, res) => {
  try {
    const totalCinemas = await Cinema.countDocuments({});
    const activeCinemas = await Cinema.countDocuments({ isActive: true });
    const inactiveCinemas = await Cinema.countDocuments({ isActive: false });

    const statistics = {
      total: totalCinemas,
      active: activeCinemas,
      inactive: inactiveCinemas,
      activePercentage: totalCinemas > 0 ? Math.round((activeCinemas / totalCinemas) * 100) : 0
    };

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (err) {
    console.error('Get cinema statistics error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thống kê'
    });
  }
};