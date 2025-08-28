// controllers/seatController.js - VERSION FIXED
const Seat = require('../models/seatModel');
const Room = require('../models/roomModel');
const Showtime = require('../models/showTimeModel');
const Ticket = require('../models/ticketModel'); // ✅ THÊM IMPORT NÀY Ở ĐẦU

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

    // ✅ SỬA: Sử dụng Ticket đã import ở đầu file
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

    // ✅ SỬA: Sử dụng Ticket đã import ở đầu file
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

// ✅ VALIDATE SEATS AVAILABILITY - VERSION FIXED
// @desc    Kiểm tra ghế có khả dụng cho suất chiếu không
// @route   POST /api/seats/validate-availability
// @access  Public
exports.validateSeatsAvailability = async (req, res) => {
  try {
    const { showtimeId, seatIds } = req.body;

    // Validate input
    if (!showtimeId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin suất chiếu hoặc danh sách ghế'
      });
    }

    console.log('🔍 Validating seats availability:', { showtimeId, seatIds });

    // Kiểm tra ghế có tồn tại không
    const seats = await Seat.find({ _id: { $in: seatIds } }).populate('room', 'name');
    
    if (seats.length !== seatIds.length) {
      const foundSeatIds = seats.map(s => s._id.toString());
      const missingSeatIds = seatIds.filter(id => !foundSeatIds.includes(id));
      
      return res.status(404).json({
        success: false,
        message: 'Một số ghế không tồn tại',
        missingSeats: missingSeatIds
      });
    }

    // ✅ SỬA: Sử dụng Showtime đã import ở đầu file (bỏ dòng require)
    const showtime = await Showtime.findById(showtimeId);
    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Suất chiếu không tồn tại'
      });
    }

    // ✅ SỬA: Sử dụng Ticket đã import ở đầu file (bỏ dòng require)
    // Tìm các vé đã đặt cho suất chiếu này với trạng thái active
    const existingBookings = await Ticket.find({
      showtime: showtimeId,
      status: { $in: ['completed', 'pending_payment'] } // Các trạng thái được coi là đã đặt
    });

    console.log(`📊 Found ${existingBookings.length} existing bookings for showtime ${showtimeId}`);

    // Lấy danh sách ghế đã được đặt
    const bookedSeatIds = [];
    existingBookings.forEach(booking => {
      if (booking.selectedSeats && Array.isArray(booking.selectedSeats)) {
        booking.selectedSeats.forEach(seat => {
          if (seat.seatId || seat._id) {
            const seatId = seat.seatId || seat._id;
            bookedSeatIds.push(seatId.toString());
          }
        });
      }
    });

    console.log('📝 Already booked seat IDs:', bookedSeatIds);

    // Kiểm tra ghế đang chọn có bị trùng không
    const conflictSeats = seatIds.filter(seatId => bookedSeatIds.includes(seatId.toString()));
    
    if (conflictSeats.length > 0) {
      // Lấy thông tin ghế bị conflict
      const conflictSeatDetails = seats.filter(seat => 
        conflictSeats.includes(seat._id.toString())
      );
      
      const conflictSeatNames = conflictSeatDetails.map(seat => seat.name);
      
      return res.status(409).json({
        success: false,
        message: `Ghế ${conflictSeatNames.join(', ')} đã được đặt`,
        unavailableSeats: conflictSeats,
        details: {
          conflictSeats: conflictSeatDetails.map(seat => ({
            id: seat._id,
            name: seat.name,
            room: seat.room.name
          }))
        }
      });
    }

    // Tất cả ghế đều khả dụng
    console.log('✅ All seats are available');

    return res.status(200).json({
      success: true,
      message: 'Tất cả ghế đều khả dụng',
      data: {
        availableSeats: seatIds,
        showtimeId: showtimeId,
        checkedAt: new Date().toISOString(),
        seatDetails: seats.map(seat => ({
          id: seat._id,
          name: seat.name,
          price: seat.price,
          room: seat.room.name
        }))
      }
    });

  } catch (error) {
    console.error('❌ Seat validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra ghế',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Lấy trạng thái ghế cho suất chiếu
// @route   GET /api/seats/status/:showtimeId
// @access  Public
// @desc    Lấy trạng thái ghế cho suất chiếu
// @route   GET /api/seats/status/:showtimeId
// @access  Public
// seatController.js - getSeatStatusByShowtime
exports.getSeatStatusByShowtime = async (req, res) => {
  console.log('🔍 [SEAT-STATUS] API Called with showtimeId:', req.params.showtimeId);
  try {
    const { showtimeId } = req.params;

    // Kiểm tra showtime có tồn tại không
    const showtime = await Showtime.findById(showtimeId)
      .populate('room', 'name')
      .populate('movie', 'name');
      
    if (!showtime) {
      console.log('❌ Showtime not found:', showtimeId);
      return res.status(404).json({
        success: false,
        message: 'Suất chiếu không tồn tại'
      });
    }

    const roomId = showtime.room._id;
    console.log('✅ Showtime found for room:', roomId);

    // Lấy tất cả ghế trong phòng hiện tại
    const allSeats = await Seat.find({ room: roomId }).sort({ name: 1 });
    console.log(`🪑 Found ${allSeats.length} seats in room ${roomId}`);

    // ✅ FIX: Query tickets với cả showtime và room để đảm bảo chính xác
    const existingBookings = await Ticket.find({
      $or: [
        { showtime: showtimeId },  // New field
        { time: showtimeId }        // Backward compatibility
      ],
      room: roomId,  // ✅ IMPORTANT: Filter by room
      status: { $in: ['completed', 'pending_payment'] }
    }).populate('seats');

    console.log(`🎫 Found ${existingBookings.length} bookings for showtime ${showtimeId} in room ${roomId}`);

    // Collect booked seat IDs - already filtered by room
    const bookedSeatIds = new Set();
    existingBookings.forEach((booking) => {
      if (booking.seats && Array.isArray(booking.seats)) {
        booking.seats.forEach((seat) => {
          // Double-check seat belongs to this room
          if (seat.room && seat.room.toString() === roomId.toString()) {
            bookedSeatIds.add(seat._id.toString());
          }
        });
      }
      
      // Also check selectedSeats field if exists
      if (booking.selectedSeats && Array.isArray(booking.selectedSeats)) {
        booking.selectedSeats.forEach((seat) => {
          const seatId = (seat.seatId || seat._id || seat).toString();
          // Verify this seat exists in our room's seats
          if (allSeats.some(s => s._id.toString() === seatId)) {
            bookedSeatIds.add(seatId);
          }
        });
      }
    });

    console.log(`🔒 Booked seats in room: ${Array.from(bookedSeatIds).join(', ')}`);

    // Format response
    const seatStatus = allSeats.map(seat => ({
      id: seat._id,
      name: seat.name,
      price: seat.price,
      status: bookedSeatIds.has(seat._id.toString()) ? 'booked' : 'available'
    }));

    const summary = {
      total: allSeats.length,
      available: seatStatus.filter(s => s.status === 'available').length,
      booked: seatStatus.filter(s => s.status === 'booked').length
    };

    console.log('📊 Summary:', summary);

    return res.status(200).json({
      success: true,
      data: {
        showtime: {
          id: showtime._id,
          movie: showtime.movie.name,
          room: showtime.room.name,
          roomId: showtime.room._id,
          date: showtime.date,
          time: showtime.time
        },
        seats: seatStatus,
        summary: summary,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Get seat status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy trạng thái ghế',
      error: error.message
    });
  }
};

// @desc    Thống kê ghế trong phòng
// @route   GET /api/seats/stats/:roomId
// @access  Public
exports.getSeatStats = async (req, res) => {
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

    // Thống kê ghế
    const totalSeats = await Seat.countDocuments({ room: roomId });
    const seats = await Seat.find({ room: roomId });
    
    // Tính giá trung bình
    const avgPrice = seats.length > 0 
      ? seats.reduce((sum, seat) => sum + seat.price, 0) / seats.length 
      : 0;

    // Tìm giá min/max
    const prices = seats.map(seat => seat.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    return res.status(200).json({
      success: true,
      data: {
        room: {
          id: room._id,
          name: room.name,
          cinema: room.cinema.name
        },
        stats: {
          totalSeats,
          avgPrice: Math.round(avgPrice),
          minPrice,
          maxPrice,
          priceRange: maxPrice - minPrice
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Get seat stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê ghế'
    });
  }
};