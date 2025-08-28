const Ticket = require('../models/ticketModel');
const Seat = require('../models/seatModel');
const SeatStatus = require('../models/seatStatusModel');
const Movie = require('../models/movieModel');
const Cinema = require('../models/cinemaModel');
const Room = require('../models/roomModel');
const Food = require('../models/foodModel');
const Discount = require('../models/discountModel');
const ShowTime = require('../models/showTimeModel');

// ✅ NEW: Import notification helper
const { createPaymentNotification } = require('./notificationController');

// ============ UTILITY FUNCTIONS ============

const logInfo = (message, data = null) => {
  console.log(`ℹ️ [TICKET] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const logError = (message, error) => {
  console.error(`❌ [TICKET] ${message}:`, error);
};

const logSuccess = (message, data = null) => {
  console.log(`✅ [TICKET] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// ============ MAIN CONTROLLERS ============

// @desc    Lấy tất cả vé (Admin) - WITH PAGINATION
// @route   GET /api/tickets
// @access  Private (Admin)
exports.getTickets = async (req, res) => {
  try {
    logInfo('GET TICKETS - Query params:', req.query);
    
    // ✅ ADD PAGINATION
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ✅ ADD FILTERS
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.search) {
      filters.$or = [
        { orderId: { $regex: req.query.search, $options: 'i' } },
        { 'userInfo.fullName': { $regex: req.query.search, $options: 'i' } },
        { 'userInfo.email': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    logInfo(`Pagination: Page ${page}, Limit ${limit}, Skip ${skip}`);
    logInfo('Filters:', filters);

    const tickets = await Ticket.find(filters)
      .populate('user', 'name email')
      .populate('seats', 'name price row column seatNumber')
      .populate('movie', 'name image duration genre')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('foodItems.food', 'name price image')
      .populate('discount', 'name percent')
      .populate({
        path: 'time',
        select: 'time date startTime showDate', 
        populate: {
          path: 'movie room cinema',
          select: 'name'
        }
      })
      .sort('-bookingTime')
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments(filters);

    logSuccess(`Found ${tickets.length} tickets out of ${total} total`);

    // ✅ TRANSFORM DATA for consistent frontend format
    const transformedTickets = tickets.map(ticket => ({
      _id: ticket._id,
      orderId: ticket.orderId,
      
      // User info
      user: ticket.user,
      userInfo: ticket.userInfo,
      customerName: ticket.userInfo?.fullName || ticket.user?.name || 'N/A',
      customerEmail: ticket.userInfo?.email || ticket.user?.email || 'N/A',
      
      // Movie info
      movie: ticket.movie,
      movieTitle: ticket.movie?.name || 'N/A',
      
      // Cinema & Room info
      cinema: ticket.cinema,
      room: ticket.room,
      cinemaName: ticket.cinema?.name || 'N/A',
      roomName: ticket.room?.name || 'N/A',
      
      // Showtime info
      showtime: ticket.time,
      showDate: ticket.time?.showDate || ticket.time?.date || ticket.showdate,
      startTime: ticket.time?.startTime || ticket.time?.time,
      
      // Seats info
      seats: ticket.seats,
      seatNumbers: ticket.seats?.map(seat => 
        seat.seatNumber || seat.name || `${seat.row || ''}${seat.column || ''}`
      ).join(', ') || 'N/A',
      
      // Financial info
      totalAmount: ticket.total,
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
      discount: ticket.discount
    }));

    res.status(200).json({
      success: true,
      count: transformedTickets.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: transformedTickets
    });
  } catch (err) {
    logError('getTickets Error', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy danh sách vé',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Lấy chi tiết vé - IMPROVED
// @route   GET /api/tickets/:id
// @access  Private
exports.getTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    logInfo('Getting ticket with ID:', ticketId);

    // ✅ Validate ObjectId
    if (!ticketId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'ID vé không hợp lệ'
      });
    }

    const ticket = await Ticket.findById(ticketId)
      .populate('user', 'name email number_phone')
      .populate('seats', 'name price row column seatNumber')
      .populate('movie', 'name duration image genre')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('foodItems.food', 'name price image')
      .populate('discount', 'name percent')
      .populate({
        path: 'time',
        select: 'time date startTime showDate',
        populate: {
          path: 'movie room cinema',
          select: 'name'
        }
      });

    if (!ticket) {
      logError('Ticket not found', { ticketId });
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy vé'
      });
    }

    logSuccess('Found ticket:', { orderId: ticket.orderId, status: ticket.status });

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    logError('getTicket Error', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy chi tiết vé',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Tìm vé theo orderId - IMPROVED
// @route   GET /api/tickets/order/:orderId
// @access  Public
exports.getTicketByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    logInfo('Searching ticket by orderId:', orderId);

    const ticket = await Ticket.findOne({ orderId })
      .populate('user', 'name email number_phone')
      .populate('seats', 'name price row column seatNumber')
      .populate('movie', 'name duration image genre')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('foodItems.food', 'name price image')
      .populate('discount', 'name percent')
      .populate({
        path: 'time',
        select: 'time date startTime showDate'
      });

    if (!ticket) {
      logError('Ticket not found by orderId', { orderId });
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy vé với mã này'
      });
    }

    logSuccess('Found ticket by orderId:', { orderId, status: ticket.status });

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    logError('getTicketByOrderId Error', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi tìm vé theo mã'
    });
  }
};

// @desc    Lấy vé theo email (for guest users) - IMPROVED
// @route   GET /api/tickets/email/:email
// @access  Public
exports.getTicketsByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    logInfo('Searching tickets for email:', email);

    // ✅ ADD PAGINATION for email search
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const tickets = await Ticket.find({ 'userInfo.email': email })
      .populate('seats', 'name price row column seatNumber')
      .populate('movie', 'name image duration genre')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('foodItems.food', 'name price')
      .populate({
        path: 'time',
        select: 'time date startTime showDate'
      })
      .sort('-bookingTime')
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments({ 'userInfo.email': email });

    logSuccess(`Found ${tickets.length} tickets for email: ${email} (${total} total)`);
    
    if (tickets.length > 0) {
      logInfo('Sample ticket:', {
        orderId: tickets[0].orderId,
        movie: tickets[0].movie?.name,
        status: tickets[0].status
      });
    }

    res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: tickets
    });
  } catch (err) {
    logError(`getTicketsByEmail Error for ${req.params.email}`, err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi tìm vé theo email'
    });
  }
};

// @desc    Lấy vé của người dùng hiện tại - IMPROVED
// @route   GET /api/tickets/mytickets
// @access  Private
exports.getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    logInfo('Getting tickets for user:', userId);

    // ✅ ADD PAGINATION
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const tickets = await Ticket.find({ user: userId })
      .populate('seats', 'name price row column seatNumber')
      .populate('movie', 'name image duration genre')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('foodItems.food', 'name price')
      .populate({
        path: 'time',
        select: 'time date startTime showDate'
      })
      .sort('-bookingTime')
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments({ user: userId });

    logSuccess(`Found ${tickets.length} tickets for user: ${userId} (${total} total)`);

    res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: tickets
    });
  } catch (err) {
    logError('getMyTickets Error', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy vé của bạn'
    });
  }
};

// @desc    Lấy lịch sử vé của một user (Admin) - IMPROVED
// @route   GET /api/tickets/user/:userId
// @access  Private (Admin)
exports.getTicketsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    logInfo('Getting tickets for user ID:', userId);
    
    // ✅ ADD PAGINATION
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // ✅ Validate ObjectId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'ID người dùng không hợp lệ'
      });
    }

    const tickets = await Ticket.find({ user: userId })
      .populate('movie', 'name image duration genre')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('seats', 'name price seatNumber row column')
      .populate({
        path: 'time',
        select: 'time date startTime showDate',
        populate: {
          path: 'movie room cinema',
          select: 'name'
        }
      })
      .populate('foodItems.food', 'name price image')
      .populate('discount', 'name percent')
      .sort('-bookingTime')
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments({ user: userId });

    // ✅ Transform data for frontend
    const transformedTickets = tickets.map(ticket => {
      let seatNumbers = 'N/A';
      if (ticket.seats && ticket.seats.length > 0) {
        seatNumbers = ticket.seats.map(seat => {
          if (seat && typeof seat === 'object') {
            return seat.seatNumber || seat.name || `${seat.row || ''}${seat.column || ''}` || seat._id?.toString().slice(-3);
          }
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
        showDate: ticket.time?.showDate || ticket.time?.date || ticket.showdate,
        startTime: ticket.time?.startTime || ticket.time?.time,
        
        // Seats info
        seats: ticket.seats,
        seatNumbers: seatNumbers,
        seatNumber: seatNumbers,
        
        // Financial info
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

    logSuccess(`Found ${transformedTickets.length} tickets for user: ${userId} (${total} total)`);

    res.status(200).json({
      success: true,
      count: transformedTickets.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: transformedTickets
    });

  } catch (err) {
    logError('getTicketsByUser Error', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy lịch sử vé người dùng'
    });
  }
};

// @desc    Đặt vé mới (Enhanced for multiple seats/foods + ShowTime)
// @route   POST /api/tickets
// @access  Private (optional - can work for guests)
// ✅ FIX: Hoàn thành hàm createTicket với response
exports.createTicket = async (req, res) => {
  try {
    logInfo('Received booking data:', req.body);

    let ticketData;
    
    if (req.body.selectedSeats || req.body.userInfo) {
      // NEW FORMAT: From frontend
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

      // ✅ FIX: Import ShowTime model và check showtime
      const showtimeData = await ShowTime.findById(showtimeId).populate('room');
      if (!showtimeData) {
        return res.status(400).json({
          success: false,
          error: 'Suất chiếu không tồn tại'
        });
      }

      // ✅ FIX: Verify roomId matches showtime's room
      if (showtimeData.room._id.toString() !== roomId.toString()) {
        return res.status(400).json({
          success: false,
          error: 'Phòng chiếu không khớp với suất chiếu'
        });
      }

      // Process seats for new format
      const seatIds = selectedSeats.map(seat => extractId(seat));
      
      // ✅ FIX: Check all seats belong to the correct room
      const seatsInRoom = await Seat.find({
        _id: { $in: seatIds },
        room: roomId
      });

      if (seatsInRoom.length !== seatIds.length) {
        const validSeatIds = seatsInRoom.map(s => s._id.toString());
        const invalidSeatIds = seatIds.filter(id => !validSeatIds.includes(id.toString()));
        
        return res.status(400).json({
          success: false,
          error: `Một số ghế không thuộc phòng ${showtimeData.room.name}`,
          invalidSeats: invalidSeatIds
        });
      }

      // ✅ FIX: Check seat availability for THIS specific showtime
      const bookedTickets = await Ticket.find({
        $or: [
          { showtime: showtimeId },
          { time: showtimeId }
        ],
        status: { $in: ['completed', 'pending_payment'] },
        seats: { $in: seatIds }
      });

      if (bookedTickets.length > 0) {
        const bookedSeatIds = new Set();
        bookedTickets.forEach(ticket => {
          ticket.seats.forEach(seatId => bookedSeatIds.add(seatId.toString()));
        });

        const conflictSeats = seatIds.filter(id => bookedSeatIds.has(id.toString()));
        const conflictSeatNames = seatsInRoom
          .filter(s => conflictSeats.includes(s._id.toString()))
          .map(s => s.name);

        return res.status(400).json({
          success: false,
          error: `Ghế ${conflictSeatNames.join(', ')} đã được đặt cho suất chiếu này`
        });
      }

      // Process food items
      const processedFoodItems = selectedFoodItems.map(item => ({
        food: extractId(item),
        quantity: item.quantity || 1,
        price: item.price * (item.quantity || 1)
      }));

      // ✅ FIX: Create complete ticket data
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
        time: showtimeId,
        showtime: showtimeId,
        seats: seatIds,
        selectedSeats: selectedSeats.map(seat => ({
          seatId: extractId(seat),
          name: seat.name,
          price: seat.price
        })),
        foodItems: processedFoodItems,
        paymentMethod: paymentMethod || 'cash',
        seatTotalPrice,
        foodTotalPrice,
        discountAmount,
        total: totalPrice,
        status: status,
        showdate: showtime?.date || new Date().toISOString().split('T')[0],
        confirmedAt: status === 'completed' ? new Date() : null,
        discount: discount || null,
        bookingTime: new Date()
      };

      // ✅ FIX: Update seat status
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

      logInfo('Processed ticket data:', {
        orderId: ticketData.orderId,
        seats: ticketData.seats.length,
        total: ticketData.total,
        paymentMethod: ticketData.paymentMethod
      });

    } else {
      // ✅ OLD FORMAT support (nếu cần)
      return res.status(400).json({
        success: false,
        error: 'Định dạng dữ liệu không được hỗ trợ'
      });
    }

    // ✅ FIX: Create the ticket in database
    const newTicket = new Ticket(ticketData);
    const savedTicket = await newTicket.save();

    logSuccess('Ticket created successfully:', {
      id: savedTicket._id,
      orderId: savedTicket.orderId,
      status: savedTicket.status
    });

    // ✅ FIX: Populate response data
    const populatedTicket = await Ticket.findById(savedTicket._id)
      .populate('user', 'name email')
      .populate('seats', 'name price row column seatNumber')
      .populate('movie', 'name image duration genre')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('foodItems.food', 'name price image')
      .populate('discount', 'name percent')
      .populate({
        path: 'time',
        select: 'time date startTime showDate'
      });

    // ✅ CRITICAL: Send response back to frontend
    res.status(201).json({
      success: true,
      message: 'Vé được tạo thành công',
      data: populatedTicket
    });

  } catch (err) {
    logError('Create ticket error', err);
    
    // ✅ FIX: Always send response even on error
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Lỗi server khi tạo vé',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
};

// @desc    Cập nhật trạng thái thanh toán
// @route   PUT /api/tickets/:id/payment
// @access  Private
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticketId = req.params.id;
    
    logInfo('Updating payment status:', { ticketId, status });
    
    const ticket = await Ticket.findById(ticketId);
    
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
        
        logSuccess('Payment status update notification created');
      }
    } catch (notificationError) {
      logError('Failed to create payment status notification', notificationError);
    }

    logSuccess('Payment status updated:', { orderId: ticket.orderId, status });

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    logError('updatePaymentStatus Error', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật trạng thái thanh toán'
    });
  }
};

// @desc    Cập nhật vé (Admin)
// @route   PUT /api/tickets/:id
// @access  Private (Admin)
exports.updateTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    logInfo('Updating ticket:', { ticketId, updates: req.body });
    
    let ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy vé'
      });
    }

    ticket = await Ticket.findByIdAndUpdate(ticketId, req.body, {
      new: true,
      runValidators: true
    });

    logSuccess('Ticket updated:', ticket.orderId);

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    logError('updateTicket Error', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật vé'
    });
  }
};

// @desc    Xóa vé
// @route   DELETE /api/tickets/:id
// @access  Private (Admin)
exports.deleteTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    logInfo('Deleting ticket:', ticketId);
    
    const ticket = await Ticket.findById(ticketId);

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

    await Ticket.findByIdAndDelete(ticketId);

    logSuccess('Ticket deleted:', ticket.orderId);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    logError('deleteTicket Error', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xóa vé'
    });
  }
};

// @desc    Hủy vé
// @route   PUT /api/tickets/:id/cancel
// @access  Private
exports.cancelTicket = async (req, res) => {
  try {
    const { reason } = req.body;
    const ticketId = req.params.id;
    
    logInfo('Cancelling ticket:', { ticketId, reason });
    
    const ticket = await Ticket.findById(ticketId);
    
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
        
        logSuccess('Ticket cancellation notification created');
      }
    } catch (notificationError) {
      logError('Failed to create cancellation notification', notificationError);
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

    logSuccess('Ticket cancelled:', ticket.orderId);

    res.status(200).json({
      success: true,
      message: 'Vé đã được hủy thành công',
      data: ticket
    });
  } catch (err) {
    logError('Cancel ticket error', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi hủy vé'
    });
  }
};

// @desc    Xác thực vé (QR scan tại rạp)
// @route   GET /api/tickets/:id/validate
// @access  Private (Cinema staff)
exports.validateTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    logInfo('Validating ticket:', ticketId);
    
    const ticket = await Ticket.findById(ticketId)
      .populate('movie', 'name image')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('seats', 'name')
      .populate({
        path: 'time',
        select: 'time date startTime showDate'
      });
    
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
    if (ticket.time && (ticket.time.time || ticket.time.startTime)) {
      const showtimeStr = ticket.time.startTime || ticket.time.time;
      const showtimeDate = new Date(showtimeStr);
      const now = new Date();
      
      if (showtimeDate < now) {
        validationResult.warnings.push('Suất chiếu đã qua');
      }
    }

    // Check if it's too early (more than 30 minutes before showtime)
    if (ticket.time && (ticket.time.time || ticket.time.startTime)) {
      const showtimeStr = ticket.time.startTime || ticket.time.time;
      const showtimeDate = new Date(showtimeStr);
      const now = new Date();
      const timeDiff = showtimeDate.getTime() - now.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      
      if (minutesDiff > 30) {
        validationResult.warnings.push('Còn quá sớm để vào rạp');
      }
    }

    logInfo('Ticket validation result:', { 
      orderId: ticket.orderId, 
      valid: validationResult.valid,
      status: ticket.status 
    });

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
          showtime: ticket.time?.startTime || ticket.time?.time,
          status: ticket.status,
          customerName: ticket.userInfo?.fullName
        }
      }
    });
  } catch (err) {
    logError('Validate ticket error', err);
    res.status(500).json({
      success: false,
      valid: false,
      error: 'Lỗi server khi xác thực vé'
    });
  }
};

// ============ DEBUG & UTILITY CONTROLLERS ============

// @desc    Debug tickets - Kiểm tra database
// @route   GET /api/tickets/debug
// @access  Public (for debugging)
exports.debugTickets = async (req, res) => {
  try {
    logInfo('DEBUG TICKETS START');
    
    const totalTickets = await Ticket.countDocuments();
    logInfo(`Total tickets in DB: ${totalTickets}`);
    
    const sampleTickets = await Ticket.find().limit(3).lean();
    logInfo('Sample tickets:', sampleTickets.map(t => ({
      id: t._id,
      orderId: t.orderId,
      email: t.userInfo?.email,
      movie: t.movie,
      status: t.status,
      createdAt: t.bookingTime
    })));
    
    const emailTickets = await Ticket.find({'userInfo.email': {$exists: true}}).limit(5);
    logInfo('Email tickets:', emailTickets.map(t => t.userInfo?.email));
    
    // Check ShowTime reference
    const showtimeTickets = await Ticket.find({time: {$exists: true}})
      .populate('time')
      .limit(3);
    logInfo('Showtime data:', showtimeTickets.map(t => ({
      ticketId: t._id,
      showtimeId: t.time?._id,
      showtimeData: t.time
    })));

    // Check different status counts
    const statusCounts = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Check email distribution
    const emailCounts = await Ticket.aggregate([
      { $group: { _id: '$userInfo.email', count: { $sum: 1 } } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      debug: {
        totalTickets,
        sampleTickets: sampleTickets.length,
        emailTickets: emailTickets.length,
        showtimeTickets: showtimeTickets.length,
        statusDistribution: statusCounts,
        topEmails: emailCounts.map(e => ({ email: e._id, count: e.count })),
        sampleData: {
          tickets: sampleTickets.map(t => ({
            orderId: t.orderId,
            email: t.userInfo?.email,
            status: t.status,
            movie: t.movie,
            total: t.total
          })),
          showtimes: showtimeTickets.map(t => ({
            ticketId: t._id,
            showtimeFields: t.time ? Object.keys(t.time.toObject()) : 'not populated'
          }))
        }
      }
    });
  } catch (err) {
    logError('Debug error', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Thống kê vé
// @route   GET /api/tickets/stats
// @access  Private (Admin)
exports.getTicketStats = async (req, res) => {
  try {
    logInfo('Getting ticket statistics');

    const stats = await Promise.all([
      // Total tickets
      Ticket.countDocuments(),
      
      // Tickets by status
      Ticket.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      // Revenue by day (last 30 days)
      Ticket.aggregate([
        {
          $match: {
            status: 'completed',
            bookingTime: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$bookingTime' } },
            revenue: { $sum: '$total' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Top movies
      Ticket.aggregate([
        { $match: { status: 'completed' } },
        {
          $lookup: {
            from: 'movies',
            localField: 'movie',
            foreignField: '_id',
            as: 'movieData'
          }
        },
        { $unwind: '$movieData' },
        {
          $group: {
            _id: '$movie',
            movieName: { $first: '$movieData.name' },
            ticketCount: { $sum: 1 },
            revenue: { $sum: '$total' }
          }
        },
        { $sort: { ticketCount: -1 } },
        { $limit: 5 }
      ])
    ]);

    const [totalTickets, statusCounts, dailyRevenue, topMovies] = stats;

    logSuccess('Statistics generated successfully');

    res.status(200).json({
      success: true,
      data: {
        totalTickets,
        statusDistribution: statusCounts,
        dailyRevenue,
        topMovies,
        generatedAt: new Date()
      }
    });
  } catch (err) {
    logError('getTicketStats Error', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thống kê'
    });
  }
};
// @desc    Lấy vé theo suất chiếu cụ thể
// @route   GET /api/tickets/showtime/:showtimeId
// @access  Private (Admin)
exports.getTicketsByShowtime = async (req, res) => {
  try {
    const { showtimeId } = req.params;
    logInfo('Getting tickets for showtime:', showtimeId);

    const tickets = await Ticket.find({ 
      time: showtimeId,
      status: { $in: ['completed', 'pending_payment', 'cancelled'] }
    })
      .populate('seats', 'name price row column seatNumber')
      .populate('userInfo')
      .populate('movie', 'name image duration')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate({
        path: 'time',
        select: 'time date',
        populate: {
          path: 'movie',
          select: 'name'
        }
      })
      .sort('-bookingTime');

    const transformedTickets = tickets.map(ticket => ({
      _id: ticket._id,
      orderId: ticket.orderId,
      customerName: ticket.userInfo?.fullName || 'N/A',
      customerEmail: ticket.userInfo?.email || 'N/A',
      customerPhone: ticket.userInfo?.phone || 'N/A',
      seats: ticket.seats,
      seatNames: ticket.seats?.map(seat => seat.name).join(', ') || 'N/A',
      seatCount: ticket.seats?.length || 0,
      movie: ticket.movie,
      showtime: ticket.time,
      cinema: ticket.cinema,
      room: ticket.room,
      totalAmount: ticket.total,
      status: ticket.status,
      paymentMethod: ticket.paymentMethod,
      bookingTime: ticket.bookingTime,
      confirmedAt: ticket.confirmedAt,
      cancelledAt: ticket.cancelledAt
    }));

    logSuccess(`Found ${transformedTickets.length} tickets for showtime: ${showtimeId}`);

    res.status(200).json({
      success: true,
      count: transformedTickets.length,
      data: transformedTickets
    });
  } catch (err) {
    logError('getTicketsByShowtime Error', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy vé theo suất chiếu'
    });
  }
};

// @desc    Lấy trạng thái booking của ghế trong suất chiếu
// @route   GET /api/tickets/seat-status/:showtimeId  
// @access  Private (Admin)
exports.getSeatBookingStatus = async (req, res) => {
  try {
    const { showtimeId } = req.params;
    logInfo('Getting seat booking status for showtime:', showtimeId);

    // Lấy từ SeatStatus model
    const seatStatuses = await SeatStatus.find({ 
      showtime: showtimeId 
    })
      .populate('seat', 'name price')
      .populate('room', 'name');

    // Lấy thông tin booking từ Tickets
    const tickets = await Ticket.find({ 
      time: showtimeId,
      status: { $in: ['completed', 'pending_payment'] }
    })
      .populate('seats', 'name')
      .populate('userInfo');

    // Combine cả 2 sources
    const seatBookingMap = {};
    let totalBooked = 0;
    let confirmedBookings = 0;
    let pendingBookings = 0;

    // Process SeatStatus data
    seatStatuses.forEach(seatStatus => {
      if (seatStatus.status === 'booked' || seatStatus.status === 'reserved') {
        seatBookingMap[seatStatus.seat._id] = {
          status: seatStatus.status === 'booked' ? 'booked' : 'reserved',
          seatName: seatStatus.seat.name,
          seatPrice: seatStatus.seat.price,
          ticketId: null,
          orderId: null,
          customerName: null,
          customerPhone: null,
          customerEmail: null,
          bookingTime: null
        };
        totalBooked++;
      }
    });

    // Enhance với ticket data
    tickets.forEach(ticket => {
      ticket.seats.forEach(seat => {
        if (seatBookingMap[seat._id]) {
          seatBookingMap[seat._id] = {
            ...seatBookingMap[seat._id],
            status: ticket.status === 'completed' ? 'booked' : 'pending',
            ticketId: ticket._id,
            orderId: ticket.orderId,
            customerName: ticket.userInfo?.fullName,
            customerPhone: ticket.userInfo?.phone,
            customerEmail: ticket.userInfo?.email,
            bookingTime: ticket.bookingTime
          };
          
          if (ticket.status === 'completed') {
            confirmedBookings++;
          } else {
            pendingBookings++;
          }
        }
      });
    });

    logSuccess(`Seat status retrieved: ${totalBooked} booked seats for showtime ${showtimeId}`);

    res.status(200).json({
      success: true,
      data: {
        showtimeId,
        seatStatus: seatBookingMap,
        statistics: {
          totalBooked,
          confirmedBookings,
          pendingBookings
        }
      }
    });
  } catch (err) {
    logError('getSeatBookingStatus Error', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy trạng thái ghế'
    });
  }
};
// @desc    Quét mã QR để validate vé
// @route   POST /api/tickets/scan
// @access  Private (Staff)
exports.scanTicket = async (req, res) => {
  try {
    const { qrData } = req.body;
    logInfo('Scanning QR:', qrData);
    
    let ticketQuery;
    try {
      const parsed = JSON.parse(qrData);
      ticketQuery = { orderId: parsed.ticketId };
    } catch {
      ticketQuery = { orderId: qrData };
    }
    
    const ticket = await Ticket.findOne(ticketQuery)
      .populate('movie', 'name')
      .populate('cinema', 'name') 
      .populate('room', 'name')
      .populate('seats', 'name seatNumber');
    
    if (!ticket) {
      return res.json({
        success: false,
        valid: false,
        message: 'Vé không tồn tại'
      });
    }
    
    if (ticket.status === 'used') {
      return res.json({
        success: false,
        valid: false, 
        message: 'Vé đã được sử dụng'
      });
    }
    
    if (ticket.status !== 'completed') {
      return res.json({
        success: false,
        valid: false,
        message: 'Vé chưa thanh toán'
      });
    }
    
    // ✅ FIX: Lưu cả status VÀ usedAt
    ticket.status = 'used';
    ticket.usedAt = new Date();
    
    const savedTicket = await ticket.save();
    
    // Debug log
    logSuccess('Ticket marked as used:', {
      orderId: savedTicket.orderId,
      status: savedTicket.status,
      usedAt: savedTicket.usedAt
    });
    
    res.json({
      success: true,
      valid: true,
      message: 'Check-in thành công',
      data: {
        orderId: ticket.orderId,
        movieName: ticket.movie?.name,
        cinemaName: ticket.cinema?.name,
        customerName: ticket.userInfo?.fullName
      }
    });
    
  } catch (error) {
    logError('Scan error', error);
    res.status(500).json({
      success: false,
      valid: false,
      message: 'Lỗi server'
    });
  }
};
// @desc    Lấy lịch sử quét vé (các vé đã được scan)
// @route   GET /api/tickets/scan-history
// @access  Private (Staff)
exports.getScanHistory = async (req, res) => {
  try {
    logInfo('Getting scan history');
    
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    
    const scanHistory = await Ticket.find({ 
      status: 'used',
      usedAt: { $exists: true }
    })
    .populate('movie', 'name')
    .populate('cinema', 'name')
    .populate('room', 'name')
    .populate('seats', 'name seatNumber')
    .populate({
      path: 'time',
      select: 'startTime showDate time date'
    })
    .sort({ usedAt: -1 })
    .skip(skip)
    .limit(limit);

    logInfo(`Found ${scanHistory.length} tickets for scan history`);
    
    // Debug time data
    if (scanHistory.length > 0) {
      logInfo('Sample time data:', scanHistory[0]?.time);
    }

    const transformedHistory = scanHistory.map(ticket => {
      let showTime = 'N/A';
      
      // Cải thiện logic xử lý showTime
      if (ticket.time) {
        const timeObj = ticket.time;
        showTime = timeObj.startTime || timeObj.showDate || timeObj.time || timeObj.date;
        
        // Format thời gian nếu có
        if (showTime && showTime !== 'N/A') {
          try {
            showTime = new Date(showTime).toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          } catch (e) {
            logError('Date format error for showTime:', e);
            showTime = String(showTime);
          }
        }
      }
      
      // Fallback: sử dụng showdate field từ ticket
      if (showTime === 'N/A' && ticket.showdate) {
        try {
          showTime = new Date(ticket.showdate).toLocaleDateString('vi-VN');
        } catch (e) {
          showTime = ticket.showdate;
        }
      }
      
      return {
        _id: ticket._id,
        orderId: ticket.orderId,
        movieTitle: ticket.movie?.name || 'N/A',
        customerName: ticket.userInfo?.fullName || 'N/A',
        seatNumber: ticket.seats?.map(s => s.seatNumber || s.name).join(', ') || 'N/A',
        showTime: showTime,
        scanTime: ticket.usedAt,
        status: 'used',
        qrData: ticket.orderId
      };
    });

    logSuccess(`Returning ${transformedHistory.length} scan history records`);

    res.json({
      success: true,
      data: transformedHistory,
      total: scanHistory.length
    });

  } catch (error) {
    logError('getScanHistory error', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy lịch sử quét'
    });
  }
};