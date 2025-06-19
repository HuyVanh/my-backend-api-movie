const SeatStatus = require('../models/seatStatusModel');
const Seat = require('../models/seatModel');
const Room = require('../models/roomModel');

// @desc    Lấy tất cả trạng thái ghế
// @route   GET /api/seatstatus
// @access  Private (Admin)
exports.getSeatStatuses = async (req, res) => {
  try {
    const seatStatuses = await SeatStatus.find()
      .populate('seat', 'name price')
      .populate('room', 'name')
      .populate('time', 'time');

    res.status(200).json({
      success: true,
      count: seatStatuses.length,
      data: seatStatuses
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết trạng thái ghế
// @route   GET /api/seatstatus/:id
// @access  Private (Admin)
exports.getSeatStatus = async (req, res) => {
  try {
    const seatStatus = await SeatStatus.findById(req.params.id)
      .populate('seat', 'name price')
      .populate('room', 'name')
      .populate('time', 'time');

    if (!seatStatus) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy trạng thái ghế'
      });
    }

    res.status(200).json({
      success: true,
      data: seatStatus
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy trạng thái ghế theo phòng
// @route   GET /api/seatstatus/room/:roomId?day=:day&time=:timeId
// @access  Public
exports.getSeatStatusByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { day, time } = req.query;

    if (!day || !time) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp day và time'
      });
    }

    // Kiểm tra room có tồn tại không
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy phòng chiếu'
      });
    }

    // Lấy tất cả ghế trong phòng
    const seats = await Seat.find({ room: roomId });

    // Lấy trạng thái ghế cho ngày và giờ cụ thể
    const seatStatuses = await SeatStatus.find({
      room: roomId,
      day: day,
      time: time
    }).populate('seat', 'name price');

    // Tạo map trạng thái ghế
    const statusMap = {};
    seatStatuses.forEach(status => {
      statusMap[status.seat._id.toString()] = status.status;
    });

    // Kết hợp thông tin ghế với trạng thái
    const seatsWithStatus = seats.map(seat => ({
      _id: seat._id,
      name: seat.name,
      price: seat.price,
      room: seat.room,
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

// @desc    Tạo trạng thái ghế mới
// @route   POST /api/seatstatus
// @access  Private (Admin)
exports.createSeatStatus = async (req, res) => {
  try {
    // Kiểm tra xem trạng thái ghế đã tồn tại chưa
    const existingSeatStatus = await SeatStatus.findOne({
      seat: req.body.seat,
      room: req.body.room,
      day: req.body.day,
      time: req.body.time
    });

    if (existingSeatStatus) {
      return res.status(400).json({
        success: false,
        error: 'Trạng thái ghế cho thời gian này đã tồn tại'
      });
    }

    const seatStatus = await SeatStatus.create(req.body);

    res.status(201).json({
      success: true,
      data: seatStatus
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật trạng thái ghế
// @route   PUT /api/seatstatus/:id
// @access  Private (Admin)
exports.updateSeatStatus = async (req, res) => {
  try {
    let seatStatus = await SeatStatus.findById(req.params.id);

    if (!seatStatus) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy trạng thái ghế'
      });
    }

    seatStatus = await SeatStatus.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: seatStatus
    });} catch (err) {
   console.error(err.message);
   res.status(500).json({
     success: false,
     error: 'Lỗi server'
   });
 }
};

// @desc    Xóa trạng thái ghế
// @route   DELETE /api/seatstatus/:id
// @access  Private (Admin)
exports.deleteSeatStatus = async (req, res) => {
 try {
   const seatStatus = await SeatStatus.findById(req.params.id);

   if (!seatStatus) {
     return res.status(404).json({
       success: false,
       error: 'Không tìm thấy trạng thái ghế'
     });
   }

   await SeatStatus.findByIdAndDelete(req.params.id);

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