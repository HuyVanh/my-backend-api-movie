const Seat = require('../models/seatModel');
const SeatStatus = require('../models/seatStatusModel');
const Room = require('../models/roomModel');

// @desc    Lấy tất cả ghế
// @route   GET /api/seats
// @access  Public
exports.getSeats = async (req, res) => {
  try {
    let query;

    // Lọc theo room nếu có
    if (req.query.room) {
      query = Seat.find({ room: req.query.room });
    } else {
      query = Seat.find();
    }

    const seats = await query.populate('room', 'name');

    res.status(200).json({
      success: true,
      count: seats.length,
      data: seats
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy ghế khả dụng cho room và thời gian cụ thể
// @route   GET /api/seats/available?room=:roomId&day=:day&time=:timeId
// @access  Public
exports.getAvailableSeats = async (req, res) => {
  try {
    const { room, day, time } = req.query;

    if (!room || !day || !time) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp room, day và time'
      });
    }

    // Lấy tất cả ghế trong phòng
    const allSeats = await Seat.find({ room }).populate('room', 'name');

    // Lấy trạng thái ghế cho ngày và giờ cụ thể
    const seatStatuses = await SeatStatus.find({
      room,
      day,
      time
    }).populate('seat');

    // Tạo map trạng thái ghế
    const statusMap = {};
    seatStatuses.forEach(status => {
      statusMap[status.seat._id.toString()] = status.status;
    });

    // Thêm trạng thái vào từng ghế
    const seatsWithStatus = allSeats.map(seat => ({
      ...seat.toObject(),
      status: statusMap[seat._id.toString()] || 'available'
    }));

    res.status(200).json({
      success: true,
      count: seatsWithStatus.length,
      data: seatsWithStatus
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết ghế
// @route   GET /api/seats/:id
// @access  Public
exports.getSeat = async (req, res) => {
  try {
    const seat = await Seat.findById(req.params.id).populate('room', 'name');

    if (!seat) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy ghế'
      });
    }

    res.status(200).json({
      success: true,
      data: seat
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Tạo ghế mới
// @route   POST /api/seats
// @access  Private (Admin)
exports.createSeat = async (req, res) => {
  try {
    // Kiểm tra room có tồn tại không
    const room = await Room.findById(req.body.room);
    if (!room) {
      return res.status(400).json({
        success: false,
        error: 'Room không tồn tại'
      });
    }

    const seat = await Seat.create(req.body);

    res.status(201).json({
      success: true,
      data: seat
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật ghế
// @route   PUT /api/seats/:id
// @access  Private (Admin)
exports.updateSeat = async (req, res) => {
  try {
    let seat = await Seat.findById(req.params.id);

    if (!seat) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy ghế'
      });
    }

    seat = await Seat.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: seat
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa ghế
// @route   DELETE /api/seats/:id
// @access  Private (Admin)
exports.deleteSeat = async (req, res) => {
  try {
    const seat = await Seat.findById(req.params.id);

    if (!seat) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy ghế'
      });
    }

    await Seat.findByIdAndDelete(req.params.id);

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