// controllers/seatStatusController.js
const SeatStatus = require('../models/seatStatusModel');
const ShowTime = require('../models/showTimeModel');
const Seat = require('../models/seatModel');
const Room = require('../models/roomModel');

// @desc    Lấy trạng thái ghế cho 1 showtime
// @route   GET /api/seatstatus/showtime/:showtimeId
// @access  Public
exports.getSeatStatusForShowtime = async (req, res) => {
  try {
    const { showtimeId } = req.params;

    // Kiểm tra showtime có tồn tại không
    const showtime = await ShowTime.findById(showtimeId)
      .populate('movie', 'name duration image')
      .populate('cinema', 'name address')
      .populate('room', 'name');

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy suất chiếu'
      });
    }

    // Lấy tất cả seat status cho showtime này
    const seatStatuses = await SeatStatus.find({ showtime: showtimeId })
      .populate({
        path: 'seat',
        select: 'name price'
      })
      .sort('seat');

    // Organize dữ liệu để dễ hiển thị
    const seats = seatStatuses.map(seatStatus => ({
      seatId: seatStatus.seat._id,
      seatName: seatStatus.seat.name,
      price: seatStatus.seat.price,
      status: seatStatus.status,
      isAvailable: seatStatus.status === 'available',
      isReserved: seatStatus.status === 'reserved',
      isBooked: seatStatus.status === 'booked',
      reservedUntil: seatStatus.reservedUntil
    }));

    // Tính summary
    const summary = {
      total: seats.length,
      available: seats.filter(s => s.status === 'available').length,
      reserved: seats.filter(s => s.status === 'reserved').length,
      booked: seats.filter(s => s.status === 'booked').length
    };

    res.json({
      success: true,
      data: {
        showtime: {
          id: showtime._id,
          movie: showtime.movie,
          cinema: showtime.cinema,
          room: showtime.room,
          date: showtime.date,
          time: showtime.time
        },
        seats,
        summary
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Reserve ghế (giữ chỗ tạm thời)
// @route   POST /api/seatstatus/reserve
// @access  Private
exports.reserveSeats = async (req, res) => {
  try {
    const { showtimeId, seatIds, userId, reserveMinutes = 15 } = req.body;

    // Validate inputs
    if (!showtimeId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin: showtimeId, seatIds'
      });
    }

    // Kiểm tra showtime có tồn tại không
    const showtime = await ShowTime.findById(showtimeId);
    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy suất chiếu'
      });
    }

    // Kiểm tra các ghế có tồn tại và available không
    const seatStatuses = await SeatStatus.find({
      showtime: showtimeId,
      seat: { $in: seatIds }
    }).populate('seat', 'name price');

    // Validate tất cả ghế đều tồn tại
    if (seatStatuses.length !== seatIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Một số ghế không tồn tại trong suất chiếu này'
      });
    }

    // Kiểm tra tất cả ghế đều available
    const unavailableSeats = seatStatuses.filter(s => s.status !== 'available');
    if (unavailableSeats.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Một số ghế đã được đặt hoặc giữ chỗ',
        unavailableSeats: unavailableSeats.map(s => ({
          name: s.seat.name,
          status: s.status
        }))
      });
    }

    // Reserve các ghế
    const reserveUntil = new Date(Date.now() + reserveMinutes * 60 * 1000);
    
    await SeatStatus.updateMany(
      {
        showtime: showtimeId,
        seat: { $in: seatIds }
      },
      {
        status: 'reserved',
        reservedUntil: reserveUntil
      }
    );

    // Tính tổng tiền
    const totalPrice = seatStatuses.reduce((sum, seatStatus) => {
      return sum + seatStatus.seat.price;
    }, 0);

    res.json({
      success: true,
      message: `Đã giữ chỗ ${seatIds.length} ghế trong ${reserveMinutes} phút`,
      data: {
        reservedSeats: seatStatuses.map(s => ({
          id: s.seat._id,
          name: s.seat.name,
          price: s.seat.price
        })),
        reservedUntil,
        totalPrice,
        expiresIn: `${reserveMinutes} phút`
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Confirm booking (chuyển từ reserved sang booked)
// @route   POST /api/seatstatus/confirm
// @access  Private
exports.confirmBooking = async (req, res) => {
  try {
    const { showtimeId, seatIds, ticketId } = req.body;

    // Validate inputs
    if (!showtimeId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin: showtimeId, seatIds'
      });
    }

    // Kiểm tra các ghế đang reserved và chưa hết hạn
    const seatStatuses = await SeatStatus.find({
      showtime: showtimeId,
      seat: { $in: seatIds },
      status: 'reserved',
      reservedUntil: { $gt: new Date() } // Chưa hết hạn
    }).populate('seat', 'name price');

    if (seatStatuses.length !== seatIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Một số ghế không còn được giữ chỗ hoặc đã hết hạn'
      });
    }

    // Confirm booking
    await SeatStatus.updateMany(
      {
        showtime: showtimeId,
        seat: { $in: seatIds }
      },
      {
        status: 'booked',
        $unset: { reservedUntil: 1 } // Xóa thời gian hết hạn
      }
    );

    res.json({
      success: true,
      message: `Đã xác nhận đặt ${seatIds.length} ghế`,
      data: {
        bookedSeats: seatStatuses.map(s => ({
          id: s.seat._id,
          name: s.seat.name,
          price: s.seat.price
        })),
        ticketId
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Cancel reservation (từ reserved về available)
// @route   POST /api/seatstatus/cancel
// @access  Private
exports.cancelReservation = async (req, res) => {
  try {
    const { showtimeId, seatIds } = req.body;

    // Validate inputs
    if (!showtimeId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin: showtimeId, seatIds'
      });
    }

    // Cancel reservation
    const result = await SeatStatus.updateMany(
      {
        showtime: showtimeId,
        seat: { $in: seatIds },
        status: 'reserved'
      },
      {
        status: 'available',
        $unset: { reservedUntil: 1 }
      }
    );

    res.json({
      success: true,
      message: `Đã hủy giữ chỗ cho ${result.modifiedCount} ghế`,
      cancelledCount: result.modifiedCount
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Cleanup expired reservations (dùng cho cron job)
// @route   POST /api/seatstatus/cleanup
// @access  Private (Admin)
exports.cleanupExpiredReservations = async (req, res) => {
  try {
    const result = await SeatStatus.updateMany(
      {
        status: 'reserved',
        reservedUntil: { $lt: new Date() }
      },
      {
        status: 'available',
        $unset: { reservedUntil: 1 }
      }
    );

    console.log(`Cleaned up ${result.modifiedCount} expired reservations`);

    res.json({
      success: true,
      message: `Đã làm sạch ${result.modifiedCount} ghế hết hạn giữ chỗ`,
      cleanedCount: result.modifiedCount
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Lấy thống kê seat status
// @route   GET /api/seatstatus/stats/:showtimeId
// @access  Public
exports.getSeatStatusStats = async (req, res) => {
  try {
    const { showtimeId } = req.params;

    // Kiểm tra showtime có tồn tại không
    const showtime = await ShowTime.findById(showtimeId);
    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy suất chiếu'
      });
    }

    // Thống kê theo status
    const stats = await SeatStatus.aggregate([
      { $match: { showtime: mongoose.Types.ObjectId(showtimeId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert to object
    const statusStats = {};
    stats.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });

    // Ensure all statuses are included
    const finalStats = {
      available: statusStats.available || 0,
      reserved: statusStats.reserved || 0,
      booked: statusStats.booked || 0,
      total: (statusStats.available || 0) + (statusStats.reserved || 0) + (statusStats.booked || 0)
    };

    // Tính phần trăm
    const percentages = {};
    Object.keys(finalStats).forEach(key => {
      if (key !== 'total') {
        percentages[key] = finalStats.total > 0 ? 
          Math.round((finalStats[key] / finalStats.total) * 100) : 0;
      }
    });

    res.json({
      success: true,
      data: {
        showtime: {
          id: showtime._id,
          date: showtime.date,
          time: showtime.time
        },
        stats: finalStats,
        percentages
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Khởi tạo seat status cho showtime (nếu chưa có)
// @route   POST /api/seatstatus/initialize/:showtimeId
// @access  Private (Admin)
exports.initializeSeatStatus = async (req, res) => {
  try {
    const { showtimeId } = req.params;

    // Kiểm tra showtime có tồn tại không
    const showtime = await ShowTime.findById(showtimeId);
    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy suất chiếu'
      });
    }

    // Kiểm tra đã có seat status chưa
    const existingCount = await SeatStatus.countDocuments({ showtime: showtimeId });
    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Suất chiếu đã có ${existingCount} seat status`
      });
    }

    // Lấy tất cả ghế trong room
    const seats = await Seat.find({ room: showtime.room });
    
    if (seats.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Phòng chiếu chưa có ghế nào'
      });
    }

    // Tạo seat status cho tất cả ghế
    const seatStatuses = seats.map(seat => ({
      seat: seat._id,
      room: showtime.room,
      status: 'available',
      day: showtime.date,
      showtime: showtime._id
    }));

    const createdSeatStatuses = await SeatStatus.insertMany(seatStatuses);

    res.status(201).json({
      success: true,
      message: `Đã khởi tạo ${createdSeatStatuses.length} seat status cho suất chiếu`,
      data: {
        showtime: showtime._id,
        seatsInitialized: createdSeatStatuses.length
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};