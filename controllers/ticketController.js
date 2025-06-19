const Ticket = require('../models/ticketModel');
const Seat = require('../models/seatModel');
const SeatStatus = require('../models/seatStatusModel');
const Movie = require('../models/movieModel');
const Cinema = require('../models/cinemaModel');
const Room = require('../models/roomModel');

// @desc    Lấy tất cả vé (Admin)
// @route   GET /api/tickets
// @access  Private (Admin)
exports.getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('user', 'name email')
      .populate('seat', 'name')
      .populate('movie', 'name')
      .populate('cinema', 'name')
      .populate('room', 'name')
      .populate('food', 'name price')
      .populate('discount', 'name percent')
      .populate('time', 'time');

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
// @access  Private (Admin)
exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('user', 'name email number_phone')
      .populate('seat', 'name price')
      .populate('movie', 'name duration')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('food', 'name price')
      .populate('discount', 'name percent')
      .populate('time', 'time');

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

// @desc    Đặt vé mới
// @route   POST /api/tickets
// @access  Private
exports.createTicket = async (req, res) => {
  try {
    const { seat, movie, cinema, room, time, showdate, food, discount } = req.body;

    // Kiểm tra ghế có tồn tại và khả dụng không
    const seatExists = await Seat.findById(seat);
    if (!seatExists) {
      return res.status(400).json({
        success: false,
        error: 'Ghế không tồn tại'
      });
    }

    // Kiểm tra trạng thái ghế
    const seatStatus = await SeatStatus.findOne({
      seat: seat,
      room: room,
      day: showdate,
      time: time
    });

    if (seatStatus && seatStatus.status !== 'available') {
      return res.status(400).json({
        success: false,
        error: 'Ghế đã được đặt hoặc không khả dụng'
      });
    }

    // Tính tổng tiền
    let total = seatExists.price;
    let total_food = 0;

    if (food) {
      const foodItem = await require('../models/foodModel').findById(food);
      if (foodItem) {
        total_food = foodItem.price;
        total += total_food;
      }
    }

    // Áp dụng giảm giá nếu có
    if (discount) {
      const discountItem = await require('../models/discountModel').findById(discount);
      if (discountItem && discountItem.status === 'active') {
        const discountAmount = (total * discountItem.percent) / 100;
        total -= discountAmount;
      }
    }

    // Tạo vé mới
    const ticket = await Ticket.create({
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
      total_food
    });

    // Cập nhật trạng thái ghế
    await SeatStatus.findOneAndUpdate(
      { seat: seat, room: room, day: showdate, time: time },
      { status: 'booked' },
      { upsert: true, new: true }
    );

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('seat', 'name')
      .populate('movie', 'name')
      .populate('cinema', 'name')
      .populate('room', 'name')
      .populate('time', 'time');

    res.status(201).json({
      success: true,
      data: populatedTicket
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy vé của người dùng hiện tại
// @route   GET /api/tickets/mytickets
// @access  Private
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user.id })
      .populate('seat', 'name')
      .populate('movie', 'name image')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .populate('food', 'name price')
      .populate('time', 'time')
      .sort('-date');

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

// @desc    Cập nhật vé
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

    // Cập nhật lại trạng thái ghế về available
    await SeatStatus.findOneAndUpdate(
      { 
        seat: ticket.seat,
        room: ticket.room,
        day: ticket.showdate,
        time: ticket.time
      },
      { status: 'available' }
    );

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