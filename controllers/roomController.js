// controllers/roomController.js
const Room = require('../models/roomModel');
const Cinema = require('../models/cinemaModel');
const Seat = require('../models/seatModel');

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

    const rooms = await query.populate('cinema', 'name address');

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
      .populate('cinema', 'name address');

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy phòng chiếu'
      });
    }

    // Lấy danh sách ghế trong phòng
    const seats = await Seat.find({ room: req.params.id });

    res.status(200).json({
      success: true,
      data: {
        room,
        seats,
        seatCount: seats.length
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

    // Populate cinema sau khi tạo
    await room.populate('cinema', 'name address');

    res.status(201).json({
      success: true,
      message: 'Tạo phòng chiếu thành công',
      data: room
    });
  } catch (err) {
    console.error(err.message);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }

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

    // Kiểm tra cinema mới có tồn tại không (nếu có cập nhật cinema)
    if (req.body.cinema) {
      const cinema = await Cinema.findById(req.body.cinema);
      if (!cinema) {
        return res.status(400).json({
          success: false,
          error: 'Cinema không tồn tại'
        });
      }
    }

    room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('cinema', 'name address');

    res.status(200).json({
      success: true,
      message: 'Cập nhật phòng chiếu thành công',
      data: room
    });
  } catch (err) {
    console.error(err.message);

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }

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

    // Kiểm tra xem có ghế nào trong phòng không
    const seatCount = await Seat.countDocuments({ room: req.params.id });
    if (seatCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Không thể xóa phòng vì còn ${seatCount} ghế. Vui lòng xóa ghế trước.`
      });
    }

    // Kiểm tra xem có showtime nào sử dụng phòng này không
    const ShowTime = require('../models/showTimeModel');
    const showtimeCount = await ShowTime.countDocuments({ room: req.params.id });
    if (showtimeCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Không thể xóa phòng vì còn ${showtimeCount} suất chiếu. Vui lòng xóa suất chiếu trước.`
      });
    }

    await Room.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Xóa phòng chiếu thành công'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy phòng chiếu theo cinema
// @route   GET /api/rooms/cinema/:cinemaId
// @access  Public
exports.getRoomsByCinema = async (req, res) => {
  try {
    const rooms = await Room.find({ cinema: req.params.cinemaId })
      .populate('cinema', 'name address');

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