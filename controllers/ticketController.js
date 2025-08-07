const Ticket = require('../models/ticketModel');
const Seat = require('../models/seatModel');
const SeatStatus = require('../models/seatStatusModel');
const Movie = require('../models/movieModel');
const Cinema = require('../models/cinemaModel');
const Room = require('../models/roomModel');
const Food = require('../models/foodModel');
const Discount = require('../models/discountModel');

// ✅ NEW: Import notification helper
const { createPaymentNotification } = require('./notificationController');

// @desc    Lấy tất cả vé (Admin)
// @route   GET /api/tickets
// @access  Private (Admin)
exports.getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('user', 'name email')
      .populate('seats', 'name price')
      .populate('movie', 'name image')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('foodItems.food', 'name price')
      .populate('discount', 'name percent')
      .populate('time', 'time date') // ✅ FIXED: now references ShowTime
      .sort('-bookingTime');

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết vé
// @route   GET /api/tickets/:id
// @access  Private
exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('user', 'name email number_phone')
      .populate('seats', 'name price')
      .populate('movie', 'name duration image genre')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('foodItems.food', 'name price image')
      .populate('discount', 'name percent')
      .populate('time', 'time date'); // ✅ FIXED: ShowTime has both time and date fields

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy vé'
      });
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Tìm vé theo orderId
// @route   GET /api/tickets/order/:orderId
// @access  Public
exports.getTicketByOrderId = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ orderId: req.params.orderId })
      .populate('user', 'name email number_phone')
      .populate('seats', 'name price')
      .populate('movie', 'name duration image genre')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('foodItems.food', 'name price image')
      .populate('discount', 'name percent')
      .populate('time', 'time');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy vé với mã này'
      });
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Đặt vé mới (Enhanced for multiple seats/foods + ShowTime)
// @route   POST /api/tickets
// @access  Private (optional - can work for guests)
exports.createTicket = async (req, res) => {
  try {
    console.log('📝 Received booking data:', JSON.stringify(req.body, null, 2));

    // ✅ Handle both old API format and new frontend format
    let ticketData;
    
    // Check if this is new frontend format (has selectedSeats, userInfo, etc.)
    if (req.body.selectedSeats || req.body.userInfo) {
      // ✅ NEW FORMAT: From frontend
      const { 
        orderId,
        movieTitle,
        movieId,
        selectedSeats = [],
        selectedFoodItems = [],
        seatTotalPrice = 0,
        foodTotalPrice = 0,
        discountAmount = 0,
        totalPrice,
        cinema,
        room,
        showtime,
        userInfo,
        paymentMethod,
        status = 'pending_payment',
        discount
      } = req.body;

      // Extract IDs from objects
      const extractId = (obj) => {
        if (typeof obj === 'string') return obj;
        return obj?._id || obj?.id || obj;
      };

      const cinemaId = extractId(cinema);
      const roomId = extractId(room);
      const showtimeId = extractId(showtime);
      const movieDbId = movieId || extractId(movieTitle);

      // Validation for new format
      if (!userInfo || !userInfo.fullName || !userInfo.email || !userInfo.phone) {
        return res.status(400).json({
          success: false,
          error: 'Thông tin khách hàng không đầy đủ'
        });
      }

      if (!selectedSeats || selectedSeats.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng chọn ít nhất một ghế'
        });
      }

      // Process seats for new format
      const seatIds = selectedSeats.map(seat => extractId(seat));
      
      // Check seat availability
      for (let i = 0; i < selectedSeats.length; i++) {
        const seat = selectedSeats[i];
        const seatId = seatIds[i];
        
        const seatExists = await Seat.findById(seatId);
        if (!seatExists) {
          return res.status(400).json({
            success: false,
            error: `Ghế ${seat.name || seat.seatNumber || seatId} không tồn tại`
          });
        }

        const seatStatus = await SeatStatus.findOne({
          seat: seatId,
          room: roomId,
          day: showtime?.date || new Date().toISOString().split('T')[0],
          showtime: showtimeId
        });

        if (seatStatus && seatStatus.status === 'booked') {
          return res.status(400).json({
            success: false,
            error: `Ghế ${seat.name || seat.seatNumber} đã được đặt`
          });
        }
      }

      // Process food items
      const processedFoodItems = selectedFoodItems.map(item => ({
        food: extractId(item),
        quantity: item.quantity || 1,
        price: item.price * (item.quantity || 1)
      }));

      // Prepare ticket data for new format
      ticketData = {
        orderId: orderId || `TK${Date.now()}`,
        user: req.user?.id || null,
        userInfo: {
          fullName: userInfo.fullName,
          email: userInfo.email,
          phone: userInfo.phone
        },
        movie: movieDbId,
        cinema: cinemaId,
        room: roomId,
        time: showtimeId, // References ShowTime
        seats: seatIds,
        foodItems: processedFoodItems,
        paymentMethod: paymentMethod || 'cash',
        seatTotalPrice,
        foodTotalPrice,
        discountAmount,
        total: totalPrice,
        status: status,
        showdate: showtime?.date || new Date().toISOString().split('T')[0],
        confirmedAt: status === 'completed' ? new Date() : null,
        discount: discount || null
      };

      // Update seat status for new format
      for (const seatId of seatIds) {
        await SeatStatus.findOneAndUpdate(
          { 
            seat: seatId, 
            room: roomId, 
            day: showtime?.date || new Date().toISOString().split('T')[0], 
            showtime: showtimeId
          },
          { status: 'booked' },
          { upsert: true, new: true }
        );
      }

    } else {
      // ✅ OLD FORMAT: Legacy API format
      const { seat, movie, cinema, room, time, showdate, food, discount } = req.body;

      // Validation for old format
      if (!seat || !movie || !cinema || !room || !time) {
        return res.status(400).json({
          success: false,
          error: 'Thiếu thông tin bắt buộc: seat, movie, cinema, room, time'
        });
      }

      // Check seat availability (old format)
      const seatExists = await Seat.findById(seat);
      if (!seatExists) {
        return res.status(400).json({
          success: false,
          error: 'Ghế không tồn tại'
        });
      }

      const seatStatus = await SeatStatus.findOne({
        seat: seat,
        room: room,
        day: showdate,
        showtime: time
      });

      if (seatStatus && seatStatus.status !== 'available') {
        return res.status(400).json({
          success: false,
          error: 'Ghế đã được đặt hoặc không khả dụng'
        });
      }

      // Calculate pricing (old format)
      let total = seatExists.price;
      let total_food = 0;

      if (food) {
        const foodItem = await require('../models/foodModel').findById(food);
        if (foodItem) {
          total_food = foodItem.price;
          total += total_food;
        }
      }

      if (discount) {
        const discountItem = await require('../models/discountModel').findById(discount);
        if (discountItem && discountItem.status === 'active') {
          const discountAmount = (total * discountItem.percent) / 100;
          total -= discountAmount;
        }
      }

      // Prepare ticket data for old format
      ticketData = {
        user: req.user.id,
        seat,
        movie,
        cinema,
        room,
        time,
        showdate,
        food,
        discount,
        total,
        total_food,
        // Set defaults for new fields
        seats: [seat],
        paymentMethod: 'cash',
        status: 'pending_payment',
        seatTotalPrice: seatExists.price,
        foodTotalPrice: total_food,
        userInfo: {
          fullName: req.user.name || 'N/A',
          email: req.user.email || 'N/A', 
          phone: req.user.number_phone || 'N/A'
        }
      };

      // Update seat status (old format)
      await SeatStatus.findOneAndUpdate(
        { seat: seat, room: room, day: showdate, showtime: time },
        { status: 'booked' },
        { upsert: true, new: true }
      );
    }

    console.log('💾 Creating ticket with data:', JSON.stringify(ticketData, null, 2));

    // Create ticket
    const ticket = await Ticket.create(ticketData);

    // Populate and return
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('movie', 'name image duration genre')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('seats', 'name price')
      .populate('foodItems.food', 'name price image')
      .populate('time', 'time date movie room cinema')
      .populate('discount', 'name percent');

    console.log('✅ Ticket created successfully:', ticket.orderId);

    // ✅ NEW: Tạo notification cho ticket được tạo
    try {
      const userId = ticket.user || null;
      if (userId) {
        await createPaymentNotification(userId, {
          ticketId: ticket._id,
          paymentId: null,
          amount: ticket.total,
          currency: 'vnd'
        }, 'ticket_booked');
        
        console.log('✅ Ticket booking notification created');
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to create ticket notification:', notificationError);
      // Không fail ticket creation nếu notification thất bại
    }

    res.status(201).json({
      success: true,
      data: populatedTicket,
      orderId: ticket.orderId || ticket._id
    });

  } catch (err) {
    console.error('❌ Create ticket error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi tạo vé',
      details: err.message
    });
  }
};

// @desc    Lấy vé của người dùng hiện tại
// @route   GET /api/tickets/mytickets
// @access  Private
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user.id })
      .populate('seats', 'name price')
      .populate('movie', 'name image duration')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('foodItems.food', 'name price')
      .populate('time', 'time')
      .sort('-bookingTime');

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy vé theo email (for guest users)
// @route   GET /api/tickets/email/:email
// @access  Public
exports.getTicketsByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    const tickets = await Ticket.find({ 'userInfo.email': email })
      .populate('seats', 'name price')
      .populate('movie', 'name image duration')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('foodItems.food', 'name price')
      .populate('time', 'time')
      .sort('-bookingTime');

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật trạng thái thanh toán
// @route   PUT /api/tickets/:id/payment
// @access  Private
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy vé'
      });
    }

    ticket.status = status;
    if (status === 'completed') {
      ticket.confirmedAt = new Date();
    }
    
    await ticket.save();

    // ✅ NEW: Tạo notification cho payment status update  
    try {
      if (ticket.user && status === 'completed') {
        await createPaymentNotification(ticket.user, {
          ticketId: ticket._id,
          paymentId: ticket.stripePaymentIntentId || null,
          amount: ticket.total,
          currency: 'vnd'
        }, 'payment_success');
        
        console.log('✅ Payment status update notification created');
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to create payment status notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật vé (Admin)
// @route   PUT /api/tickets/:id
// @access  Private (Admin)
exports.updateTicket = async (req, res) => {
  try {
    let ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy vé'
      });
    }

    ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa vé
// @route   DELETE /api/tickets/:id
// @access  Private (Admin)
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy vé'
      });
    }

    // ✅ Update multiple seats status back to available
    if (ticket.seats && ticket.seats.length > 0) {
      for (const seatId of ticket.seats) {
        await SeatStatus.findOneAndUpdate(
          { 
            seat: seatId,
            room: ticket.room,
            day: ticket.showdate,
            time: ticket.time
          },
          { status: 'available' }
        );
      }
    }

    // ✅ Legacy support for single seat
    if (ticket.seat) {
      await SeatStatus.findOneAndUpdate(
        { 
          seat: ticket.seat,
          room: ticket.room,
          day: ticket.showdate,
          time: ticket.time
        },
        { status: 'available' }
      );
    }

    await Ticket.findByIdAndDelete(req.params.id);

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

// ✅ NEW: Cancel ticket
// @desc    Hủy vé
// @route   PUT /api/tickets/:id/cancel
// @access  Private
exports.cancelTicket = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy vé'
      });
    }

    // Check if user owns this ticket (or is admin)
    if (ticket.user && ticket.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền hủy vé này'
      });
    }

    // Check if ticket can be cancelled
    if (ticket.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Vé đã được hủy trước đó'
      });
    }

    // Update ticket status
    ticket.status = 'cancelled';
    ticket.cancelledAt = new Date();
    ticket.cancelReason = reason || 'User cancellation';
    
    await ticket.save();

    // ✅ NEW: Tạo notification cho ticket bị hủy
    try {
      if (ticket.user) {
        await createPaymentNotification(ticket.user, {
          ticketId: ticket._id,
          paymentId: ticket.stripePaymentIntentId || null,
          amount: ticket.total,
          currency: 'vnd'
        }, 'ticket_cancelled');
        
        console.log('✅ Ticket cancellation notification created');
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to create cancellation notification:', notificationError);
    }

    // ✅ Release seats back to available
    if (ticket.seats && ticket.seats.length > 0) {
      for (const seatId of ticket.seats) {
        await SeatStatus.findOneAndUpdate(
          { 
            seat: seatId,
            room: ticket.room,
            day: ticket.showdate,
            showtime: ticket.time
          },
          { status: 'available' }
        );
      }
    }

    // ✅ Legacy support for single seat
    if (ticket.seat) {
      await SeatStatus.findOneAndUpdate(
        { 
          seat: ticket.seat,
          room: ticket.room,
          day: ticket.showdate,
          showtime: ticket.time
        },
        { status: 'available' }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Vé đã được hủy thành công',
      data: ticket
    });
  } catch (err) {
    console.error('Cancel ticket error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi hủy vé'
    });
  }
};

// ✅ NEW: Validate ticket
// @desc    Xác thực vé (QR scan tại rạp)
// @route   GET /api/tickets/:id/validate
// @access  Private (Cinema staff)
exports.validateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('movie', 'name image')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('seats', 'name')
      .populate('time', 'time date');
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: 'Không tìm thấy vé'
      });
    }

    // Check if ticket is valid
    let validationResult = {
      valid: true,
      message: 'Vé hợp lệ',
      warnings: []
    };

    // Check ticket status
    if (ticket.status === 'cancelled') {
      validationResult.valid = false;
      validationResult.message = 'Vé đã bị hủy';
    } else if (ticket.status === 'pending_payment') {
      validationResult.valid = false;
      validationResult.message = 'Vé chưa được thanh toán';
    } else if (ticket.status === 'used') {
      validationResult.valid = false;
      validationResult.message = 'Vé đã được sử dụng';
    }

    // Check if showtime has passed (optional warning)
    if (ticket.time && ticket.time.time) {
      const showtimeDate = new Date(ticket.time.time);
      const now = new Date();
      
      if (showtimeDate < now) {
        validationResult.warnings.push('Suất chiếu đã qua');
      }
    }

    // Check if it's too early (more than 30 minutes before showtime)
    if (ticket.time && ticket.time.time) {
      const showtimeDate = new Date(ticket.time.time);
      const now = new Date();
      const timeDiff = showtimeDate.getTime() - now.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      
      if (minutesDiff > 30) {
        validationResult.warnings.push('Còn quá sớm để vào rạp');
      }
    }

    res.status(200).json({
      success: true,
      ...validationResult,
      data: {
        ticket: {
          orderId: ticket.orderId,
          movie: ticket.movie?.name,
          cinema: ticket.cinema?.name,
          room: ticket.room?.name,
          seats: ticket.seats?.map(seat => seat.name).join(', '),
          showtime: ticket.time?.time,
          status: ticket.status,
          customerName: ticket.userInfo?.fullName
        }
      }
    });
  } catch (err) {
    console.error('Validate ticket error:', err.message);
    res.status(500).json({
      success: false,
      valid: false,
      error: 'Lỗi server khi xác thực vé'
    });
  }
};
// @desc    Lấy lịch sử vé của một user (Admin)
// @route   GET /api/tickets/user/:userId
// @access  Private (Admin)
// @desc    Lấy lịch sử vé của một user (Admin)
// @route   GET /api/tickets/user/:userId
// @access  Private (Admin)
exports.getTicketsByUser = async (req, res) => {
  try {
    console.log('=== GET TICKETS BY USER START ===');
    console.log('User ID:', req.params.userId);
    
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Validate ObjectId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'ID người dùng không hợp lệ'
      });
    }

    // Query tickets với populate
    const tickets = await Ticket.find({ user: userId })
      .populate('movie', 'name image duration genre')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('seats', 'name price seatNumber row column')
      .populate('time', 'time date movie room cinema')
      .populate('foodItems.food', 'name price image')
      .populate('discount', 'name percent')
      .sort({ bookingTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments({ user: userId });

    // Transform data for frontend
    const transformedTickets = tickets.map(ticket => {
      // Xử lý seats an toàn
      let seatNumbers = 'N/A';
      if (ticket.seats && ticket.seats.length > 0) {
        seatNumbers = ticket.seats.map(seat => {
          // Nếu seat đã được populate
          if (seat && typeof seat === 'object') {
            return seat.seatNumber || seat.name || `${seat.row || ''}${seat.column || ''}` || seat._id?.toString().slice(-3);
          }
          // Nếu seat chỉ là string ID
          return seat?.toString().slice(-3) || 'N/A';
        }).filter(Boolean).join(', ');
      }

      return {
        _id: ticket._id,
        orderId: ticket.orderId,
        
        // Movie info
        movie: ticket.movie,
        movieName: ticket.movie?.name || 'N/A',
        
        // Cinema & Room info
        cinema: ticket.cinema,
        room: ticket.room,
        cinemaName: ticket.cinema?.name || 'N/A',
        roomName: ticket.room?.name || 'N/A',
        
        // Showtime info
        showtime: ticket.time,
        showDate: ticket.time?.date || ticket.showdate,
        showTime: ticket.time?.time,
        
        // Seats info - FIXED
        seats: ticket.seats,
        seatNumbers: seatNumbers, // Đã xử lý an toàn
        seatNumber: seatNumbers,  // Alias cho tương thích
        
        // Pricing
        totalPrice: ticket.total,
        price: ticket.total,
        seatTotalPrice: ticket.seatTotalPrice,
        foodTotalPrice: ticket.foodTotalPrice,
        discountAmount: ticket.discountAmount,
        
        // Status & dates
        status: ticket.status,
        createdAt: ticket.bookingTime || ticket.date,
        confirmedAt: ticket.confirmedAt,
        cancelledAt: ticket.cancelledAt,
        
        // Additional info
        paymentMethod: ticket.paymentMethod,
        foodItems: ticket.foodItems,
        discount: ticket.discount,
        userInfo: ticket.userInfo,
        
        // Legacy support
        ticketCode: ticket.orderId
      };
    });

    res.status(200).json({
      success: true,
      count: transformedTickets.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: transformedTickets
    });

  } catch (err) {
    console.error('Get tickets by user error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy lịch sử vé'
    });
  }
};