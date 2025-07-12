// controllers/seatController.js
const Seat = require('../models/seatModel');
const Room = require('../models/roomModel');

// @desc    Lấy tất cả ghế
// @route   GET /api/seats
// @access  Public
exports.getSeats = async (req, res) => {
  try {
    const seats = await Seat.find().populate('room', 'name');
    
    res.status(200).json({
      success: true,
      count: seats.length,
      data: seats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Lấy ghế theo ID
// @route   GET /api/seats/:id
// @access  Public
exports.getSeat = async (req, res) => {
  try {
    const seat = await Seat.findById(req.params.id).populate('room', 'name');
    
    if (!seat) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghế'
      });
    }

    res.status(200).json({
      success: true,
      data: seat
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Lấy ghế theo phòng
// @route   GET /api/seats/room/:roomId
// @access  Public
exports.getSeatsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Kiểm tra room có tồn tại không
    const room = await Room.findById(roomId).populate('cinema', 'name');
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng chiếu'
      });
    }

    const seats = await Seat.find({ room: roomId }).populate('room', 'name');
    
    res.status(200).json({
      success: true,
      count: seats.length,
      data: {
        room,
        seats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Tạo ghế mới
// @route   POST /api/seats
// @access  Private
exports.createSeat = async (req, res) => {
  try {
    // Kiểm tra room có tồn tại không
    const room = await Room.findById(req.body.room);
    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'Phòng chiếu không tồn tại'
      });
    }

    const seat = await Seat.create(req.body);
    await seat.populate('room', 'name');
    
    res.status(201).json({
      success: true,
      message: 'Tạo ghế thành công',
      data: seat
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Cập nhật ghế
// @route   PUT /api/seats/:id
// @access  Private
exports.updateSeat = async (req, res) => {
  try {
    // Kiểm tra room có tồn tại không (nếu có update room)
    if (req.body.room) {
      const room = await Room.findById(req.body.room);
      if (!room) {
        return res.status(400).json({
          success: false,
          message: 'Phòng chiếu không tồn tại'
        });
      }
    }

    const seat = await Seat.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('room', 'name');

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghế'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật ghế thành công',
      data: seat
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Xóa ghế
// @route   DELETE /api/seats/:id
// @access  Private
exports.deleteSeat = async (req, res) => {
  try {
    const seat = await Seat.findById(req.params.id);

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghế'
      });
    }

    // Kiểm tra xem ghế có đang được sử dụng trong ticket nào không
    const Ticket = require('../models/ticketModel');
    const ticketCount = await Ticket.countDocuments({ seat: req.params.id });
    
    if (ticketCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa ghế vì có ${ticketCount} vé đã sử dụng ghế này`
      });
    }

    await seat.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Xóa ghế thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Tạo nhiều ghế cùng lúc
// @route   POST /api/seats/bulk
// @access  Private
exports.createBulkSeats = async (req, res) => {
  try {
    const { seats } = req.body;
    
    if (!seats || !Array.isArray(seats)) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu ghế không hợp lệ'
      });
    }

    // Validate tất cả rooms tồn tại
    const roomIds = [...new Set(seats.map(seat => seat.room))];
    for (const roomId of roomIds) {
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(400).json({
          success: false,
          message: `Phòng chiếu ${roomId} không tồn tại`
        });
      }
    }

    const createdSeats = await Seat.insertMany(seats);
    
    // Populate room cho tất cả seats
    const populatedSeats = await Seat.populate(createdSeats, { path: 'room', select: 'name' });
    
    res.status(201).json({
      success: true,
      message: `Tạo thành công ${createdSeats.length} ghế`,
      data: populatedSeats
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Tạo ghế tự động cho phòng theo pattern
// @route   POST /api/seats/auto-generate/:roomId
// @access  Private
exports.autoGenerateSeats = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { rows = 10, seatsPerRow = 12, basePrice = 50000 } = req.body;

    // Kiểm tra room có tồn tại không
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng chiếu'
      });
    }

    // Kiểm tra phòng đã có ghế chưa
    const existingSeats = await Seat.countDocuments({ room: roomId });
    if (existingSeats > 0) {
      return res.status(400).json({
        success: false,
        message: `Phòng đã có ${existingSeats} ghế. Vui lòng xóa ghế cũ trước khi tạo mới.`
      });
    }

    const seats = [];
    const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

    for (let i = 0; i < rows; i++) {
      for (let j = 1; j <= seatsPerRow; j++) {
        const seatName = `${rowLabels[i]}${j}`;
        
        // Tính giá theo vị trí (có thể customize)
        let price = basePrice;
        
        // Hàng đầu đắt hơn
        if (i < 2) {
          price = basePrice * 1.5;
        }
        // Hàng cuối rẻ hơn
        else if (i >= rows - 2) {
          price = basePrice * 0.8;
        }
        
        seats.push({
          name: seatName,
          price: Math.round(price),
          room: roomId
        });
      }
    }

    const createdSeats = await Seat.insertMany(seats);
    
    res.status(201).json({
      success: true,
      message: `Tạo thành công ${createdSeats.length} ghế cho phòng ${room.name}`,
      data: {
        room: room.name,
        seatsCreated: createdSeats.length,
        layout: { rows, seatsPerRow }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Xóa tất cả ghế trong phòng
// @route   DELETE /api/seats/room/:roomId
// @access  Private
exports.deleteAllSeatsInRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Kiểm tra room có tồn tại không
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng chiếu'
      });
    }

    // Kiểm tra xem có ghế nào đang được sử dụng trong ticket không
    const Ticket = require('../models/ticketModel');
    const usedSeats = await Ticket.find({ 
      seat: { $in: await Seat.find({ room: roomId }).distinct('_id') }
    }).populate('seat', 'name');

    if (usedSeats.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa vì có ${usedSeats.length} ghế đang được sử dụng trong vé đã đặt`
      });
    }

    const result = await Seat.deleteMany({ room: roomId });

    res.status(200).json({
      success: true,
      message: `Xóa thành công ${result.deletedCount} ghế trong phòng ${room.name}`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};