const Room = require('../models/roomModel');
const Cinema = require('../models/cinemaModel');

// @desc    Lấy tất cả phòng chiếu
// @route   GET /api/rooms
// @access  Public
exports.getRooms = async (req, res) => {
  try {
    let query;

    // Lọc theo cinema nếu có
    if (req.query.cinema) {
      query = Room.find({ cinema: req.query.cinema });
    } else {
      query = Room.find();
    }

    const rooms = await query
      .populate('cinema', 'name address')
      .populate('movie', 'name')
      .populate('showtime', 'time date');

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết phòng chiếu
// @route   GET /api/rooms/:id
// @access  Public
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('cinema', 'name address')
      .populate('movie', 'name duration')
      .populate('showtime', 'time date');

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy phòng chiếu'
      });
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Tạo phòng chiếu mới
// @route   POST /api/rooms
// @access  Private (Admin)
exports.createRoom = async (req, res) => {
  try {
    // Kiểm tra cinema có tồn tại không
    const cinema = await Cinema.findById(req.body.cinema);
    if (!cinema) {
      return res.status(400).json({
        success: false,
        error: 'Cinema không tồn tại'
      });
    }

    const room = await Room.create(req.body);

    res.status(201).json({
      success: true,
      data: room
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật phòng chiếu
// @route   PUT /api/rooms/:id
// @access  Private (Admin)
exports.updateRoom = async (req, res) => {
  try {
    let room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy phòng chiếu'
      });
    }

    room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa phòng chiếu
// @route   DELETE /api/rooms/:id
// @access  Private (Admin)
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy phòng chiếu'
      });
    }

    await Room.findByIdAndDelete(req.params.id);

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