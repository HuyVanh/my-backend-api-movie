// controllers/showTimeController.js
const ShowTime = require('../models/showTimeModel');
const Movie = require('../models/movieModel');
const Room = require('../models/roomModel');
const Cinema = require('../models/cinemaModel');
const Seat = require('../models/seatModel');
const SeatStatus = require('../models/seatStatusModel');
const mongoose = require('mongoose');

// @desc    Lấy tất cả thời gian chiếu
// @route   GET /api/showtimes
// @access  Public
exports.getShowtimes = async (req, res) => {
  try {
    const { page = 1, limit = 20, date, movie, cinema, room } = req.query;
    
    // Build query
    let query = {};
    
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.date = {
        $gte: targetDate,
        $lt: nextDay
      };
    }
    
    if (movie) query.movie = movie;
    if (cinema) query.cinema = cinema;
    if (room) query.room = room;

    const showtimes = await ShowTime.find(query)
      .populate('movie', 'name duration genre image')
      .populate('room', 'name')
      .populate('cinema', 'name address')
      .sort('date time')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ShowTime.countDocuments(query);

    res.status(200).json({
      success: true,
      count: showtimes.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: showtimes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy chi tiết thời gian chiếu
// @route   GET /api/showtimes/:id
// @access  Public
exports.getShowtime = async (req, res) => {
  try {
    const showtime = await ShowTime.findById(req.params.id)
      .populate('movie', 'name duration genre image storyLine')
      .populate('room', 'name')
      .populate('cinema', 'name address hotline');

    if (!showtime) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thời gian chiếu'
      });
    }

    res.status(200).json({
      success: true,
      data: showtime
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Tạo thời gian chiếu mới
// @route   POST /api/showtimes
// @access  Private (Admin)
exports.createShowtime = async (req, res) => {
  try {
    const { time, date, movie, room, cinema } = req.body;

    // Validate required fields
    if (!time || !date || !movie || !room || !cinema) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp đầy đủ thông tin: time, date, movie, room, cinema'
      });
    }

    // Validate các references tồn tại
    const movieDoc = await Movie.findById(movie);
    if (!movieDoc) {
      return res.status(400).json({
        success: false,
        error: 'Phim không tồn tại'
      });
    }

    const roomDoc = await Room.findById(room);
    if (!roomDoc) {
      return res.status(400).json({
        success: false,
        error: 'Phòng chiếu không tồn tại'
      });
    }

    const cinemaDoc = await Cinema.findById(cinema);
    if (!cinemaDoc) {
      return res.status(400).json({
        success: false,
        error: 'Rạp chiếu không tồn tại'
      });
    }

    // Check room thuộc cinema đó không
    if (roomDoc.cinema.toString() !== cinema) {
      return res.status(400).json({
        success: false,
        error: 'Phòng chiếu không thuộc rạp này'
      });
    }

    // Check for duplicate showtime
    const existingShowtime = await ShowTime.findOne({
      date: new Date(date),
      time: new Date(time),
      room
    });

    if (existingShowtime) {
      return res.status(400).json({
        success: false,
        error: 'Thời gian chiếu này đã tồn tại cho phòng này'
      });
    }

    // Tạo showtime
    const showtime = await ShowTime.create({
      time: new Date(time),
      date: new Date(date),
      movie,
      room,
      cinema
    });
    
    // *** QUAN TRỌNG: Tạo SeatStatus cho TẤT CẢ ghế trong room ***
    const seats = await Seat.find({ room });
    
    if (seats.length > 0) {
      const seatStatuses = seats.map(seat => ({
        seat: seat._id,
        room: room,
        status: 'available',
        day: new Date(date),
        showtime: showtime._id
      }));

      await SeatStatus.insertMany(seatStatuses);
      console.log(`Đã tạo ${seatStatuses.length} seat status cho showtime ${showtime._id}`);
    }
    
    // Populate the created showtime
    await showtime.populate([
      { path: 'movie', select: 'name duration genre image' },
      { path: 'room', select: 'name' },
      { path: 'cinema', select: 'name address' }
    ]);

    res.status(201).json({
      success: true,
      message: `Tạo suất chiếu thành công với ${seats.length} ghế`,
      data: showtime
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Cập nhật thời gian chiếu
// @route   PUT /api/showtimes/:id
// @access  Private (Admin)
exports.updateShowtime = async (req, res) => {
  try {
    let showtime = await ShowTime.findById(req.params.id);

    if (!showtime) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thời gian chiếu'
      });
    }

    // Validate references nếu có update
    if (req.body.movie) {
      const movieDoc = await Movie.findById(req.body.movie);
      if (!movieDoc) {
        return res.status(400).json({
          success: false,
          error: 'Phim không tồn tại'
        });
      }
    }

    if (req.body.room) {
      const roomDoc = await Room.findById(req.body.room);
      if (!roomDoc) {
        return res.status(400).json({
          success: false,
          error: 'Phòng chiếu không tồn tại'
        });
      }

      // Check room thuộc cinema đó không
      const cinemaToCheck = req.body.cinema || showtime.cinema;
      if (roomDoc.cinema.toString() !== cinemaToCheck.toString()) {
        return res.status(400).json({
          success: false,
          error: 'Phòng chiếu không thuộc rạp này'
        });
      }
    }

    if (req.body.cinema) {
      const cinemaDoc = await Cinema.findById(req.body.cinema);
      if (!cinemaDoc) {
        return res.status(400).json({
          success: false,
          error: 'Rạp chiếu không tồn tại'
        });
      }
    }

    // Check for duplicate if updating time, date, or room
    if (req.body.time || req.body.date || req.body.room) {
      const { time, date, room } = req.body;
      const checkData = {
        date: date ? new Date(date) : showtime.date,
        time: time ? new Date(time) : showtime.time,
        room: room || showtime.room
      };

      const existingShowtime = await ShowTime.findOne({
        ...checkData,
        _id: { $ne: req.params.id }
      });

      if (existingShowtime) {
        return res.status(400).json({
          success: false,
          error: 'Thời gian chiếu này đã tồn tại cho phòng này'
        });
      }

      // Nếu có thay đổi room, cần update SeatStatus
      if (req.body.room && req.body.room !== showtime.room.toString()) {
        // Xóa SeatStatus cũ
        await SeatStatus.deleteMany({ showtime: req.params.id });
        
        // Tạo SeatStatus mới cho room mới
        const seats = await Seat.find({ room: req.body.room });
        const seatStatuses = seats.map(seat => ({
          seat: seat._id,
          room: req.body.room,
          status: 'available',
          day: checkData.date,
          showtime: showtime._id
        }));

        await SeatStatus.insertMany(seatStatuses);
      }
    }

    showtime = await ShowTime.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate([
      { path: 'movie', select: 'name duration genre image' },
      { path: 'room', select: 'name' },
      { path: 'cinema', select: 'name address' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Cập nhật suất chiếu thành công',
      data: showtime
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa thời gian chiếu
// @route   DELETE /api/showtimes/:id
// @access  Private (Admin)
exports.deleteShowtime = async (req, res) => {
  try {
    const showtime = await ShowTime.findById(req.params.id);

    if (!showtime) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thời gian chiếu'
      });
    }

    // Kiểm tra xem có tickets nào đã được đặt cho showtime này không
    const Ticket = require('../models/ticketModel');
    const ticketCount = await Ticket.countDocuments({ 
      time: req.params.id // Theo model cũ, ticket reference đến time (showtime)
    });

    if (ticketCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Không thể xóa suất chiếu vì đã có ${ticketCount} vé được đặt`
      });
    }

    // Xóa tất cả SeatStatus cho showtime này
    await SeatStatus.deleteMany({ showtime: req.params.id });

    await ShowTime.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Xóa suất chiếu và dữ liệu liên quan thành công'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy thời gian chiếu theo phim
// @route   GET /api/showtimes/movie/:movieId
// @access  Public
exports.getShowtimesByMovie = async (req, res) => {
  try {
    const { movieId } = req.params;
    
    console.log('=== BACKEND DEBUG ===');
    console.log('Received movieId:', movieId);
    console.log('MovieId type:', typeof movieId);
    
    // Test query without any conditions first
    const allShowtimes = await ShowTime.countDocuments();
    console.log('Total showtimes in DB:', allShowtimes);
    
    // Test query with movie filter
    const movieShowtimes = await ShowTime.countDocuments({ movie: movieId });
    console.log('Showtimes for this movie:', movieShowtimes);
    
    // Test with ObjectId conversion
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(movieId)) {
      const movieShowtimesObj = await ShowTime.countDocuments({ 
        movie: new mongoose.Types.ObjectId(movieId) 
      });
      console.log('Showtimes with ObjectId conversion:', movieShowtimesObj);
    }
    
    // Your existing query
    let query = { movie: movieId };
    const showtimes = await ShowTime.find(query)
      .populate('movie', 'name duration genre image')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .sort('date time');

    console.log('Final query result:', showtimes.length);
    
    res.status(200).json({
      success: true,
      count: showtimes.length,
      data: showtimes
    });
  } catch (error) {
    console.error('Error in getShowtimesByMovie:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy thời gian chiếu theo phòng
// @route   GET /api/showtimes/room/:roomId
// @access  Public
exports.getShowtimesByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { date } = req.query;

    let query = { room: roomId };

    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.date = {
        $gte: targetDate,
        $lt: nextDay
      };
    }

    const showtimes = await ShowTime.find(query)
      .populate('movie', 'name duration genre image')
      .populate('room', 'name')
      .populate('cinema', 'name address')
      .sort('date time');

    res.status(200).json({
      success: true,
      count: showtimes.length,
      data: showtimes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Lấy thời gian chiếu theo ngày
// @route   GET /api/showtimes/date/:date
// @access  Public
// controllers/showTimeController.js
exports.getShowtimesByDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    console.log('=== BACKEND DEBUG ===');
    console.log('Received date param:', date);
    console.log('Date type:', typeof date);
    
    // Test total showtimes first  
    const totalShowtimes = await ShowTime.countDocuments();
    console.log('Total showtimes in database:', totalShowtimes);
    
    // Test sample showtime
    const sampleShowtime = await ShowTime.findOne();
    console.log('Sample showtime date:', sampleShowtime?.date);
    console.log('Sample showtime date type:', typeof sampleShowtime?.date);
    
    // Original date parsing
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    console.log('Parsed target date:', targetDate);
    console.log('Next day:', nextDay);
    console.log('Target date valid:', !isNaN(targetDate.getTime()));
    
    // Test different query approaches
    console.log('--- Testing different queries ---');
    
    // Query 1: Range query
    const rangeQuery = {
      date: { 
        $gte: targetDate, 
        $lt: nextDay 
      }
    };
    const rangeCount = await ShowTime.countDocuments(rangeQuery);
    console.log('Range query count:', rangeCount);
    
    // Query 2: Exact date
    const exactQuery = { date: new Date(date) };
    const exactCount = await ShowTime.countDocuments(exactQuery);
    console.log('Exact query count:', exactCount);
    
    // Query 3: Date string comparison
    const dateStr = date;
    const stringQuery = {
      $expr: {
        $eq: [
          { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          dateStr
        ]
      }
    };
    const stringCount = await ShowTime.countDocuments(stringQuery);
    console.log('String comparison count:', stringCount);
    
    // Use the query that returns results
    let finalQuery = rangeQuery;
    let queryType = 'range';
    
    if (rangeCount > 0) {
      finalQuery = rangeQuery;
      queryType = 'range';
    } else if (exactCount > 0) {
      finalQuery = exactQuery;
      queryType = 'exact';
    } else if (stringCount > 0) {
      finalQuery = stringQuery;
      queryType = 'string';
    }
    
    console.log(`Using ${queryType} query:`, finalQuery);
    
    const showtimes = await ShowTime.find(finalQuery)
      .populate('movie', 'name duration genre image')
      .populate('cinema', 'name address')
      .populate('room', 'name')
      .sort('time');

    console.log('Final showtimes found:', showtimes.length);
    
    // Log first few results
    if (showtimes.length > 0) {
      console.log('First showtime:', {
        id: showtimes[0]._id,
        date: showtimes[0].date,
        movie: showtimes[0].movie?.name,
        cinema: showtimes[0].cinema?.name
      });
    }

    res.status(200).json({
      success: true,
      count: showtimes.length,
      data: showtimes
    });
  } catch (err) {
    console.error('Error in getShowtimesByDate:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server',
      details: err.message
    });
  }
};

// @desc    Tạo thời gian chiếu tự động cho nhiều ngày
// @route   POST /api/showtimes/generate
// @access  Private (Admin)
exports.generateShowtimes = async (req, res) => {
  try {
    const { startDate, endDate, times, movie, room, cinema, excludeDates = [] } = req.body;

    // Validate input
    if (!startDate || !endDate || !times || !movie || !room || !cinema || !Array.isArray(times)) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp startDate, endDate, times, movie, room, cinema'
      });
    }

    if (times.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Danh sách thời gian không được rỗng'
      });
    }

    // Validate references
    const movieDoc = await Movie.findById(movie);
    const roomDoc = await Room.findById(room);
    const cinemaDoc = await Cinema.findById(cinema);

    if (!movieDoc || !roomDoc || !cinemaDoc) {
      return res.status(400).json({
        success: false,
        error: 'Movie, Room hoặc Cinema không tồn tại'
      });
    }

    if (roomDoc.cinema.toString() !== cinema) {
      return res.status(400).json({
        success: false,
        error: 'Phòng chiếu không thuộc rạp này'
      });
    }

    const showtimes = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (currentDate > end) {
      return res.status(400).json({
        success: false,
        error: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc'
      });
    }

    // Generate showtimes
    while (currentDate <= end) {
      const dateString = currentDate.toISOString().split('T')[0];

      // Skip excluded dates
      if (!excludeDates.includes(dateString)) {
        times.forEach(time => {
          showtimes.push({
            time: new Date(time),
            date: new Date(currentDate),
            movie: movie,
            room: room,
            cinema: cinema
          });
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Check for duplicates before creating
    const existingShowtimes = await ShowTime.find({
      date: { $gte: startDate, $lte: endDate },
      room: room
    });

    const duplicates = [];
    const newShowtimes = showtimes.filter(showtime => {
      const isDuplicate = existingShowtimes.some(existing => 
        existing.date.getTime() === showtime.date.getTime() && 
        existing.time.getTime() === showtime.time.getTime() &&
        existing.room.toString() === showtime.room
      );

      if (isDuplicate) {
        duplicates.push(`${showtime.date.toISOString().split('T')[0]} ${showtime.time.toTimeString()}`);
      }

      return !isDuplicate;
    });

    if (newShowtimes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tất cả thời gian chiếu đã tồn tại cho phòng này',
        duplicates: duplicates
      });
    }

    // Create new showtimes
    const createdShowtimes = await ShowTime.insertMany(newShowtimes);
    
    // Tạo SeatStatus cho tất cả showtimes mới
    const seats = await Seat.find({ room });
    const allSeatStatuses = [];

    for (const showtime of createdShowtimes) {
      const seatStatuses = seats.map(seat => ({
        seat: seat._id,
        room: room,
        status: 'available',
        day: showtime.date,
        showtime: showtime._id
      }));
      allSeatStatuses.push(...seatStatuses);
    }

    if (allSeatStatuses.length > 0) {
      await SeatStatus.insertMany(allSeatStatuses);
    }
    
    // Populate the created showtimes
    const populatedShowtimes = await ShowTime.find({
      _id: { $in: createdShowtimes.map(s => s._id) }
    }).populate([
      { path: 'movie', select: 'name duration genre image' },
      { path: 'room', select: 'name' },
      { path: 'cinema', select: 'name address' }
    ]);

    res.status(201).json({
      success: true,
      message: `Đã tạo ${createdShowtimes.length} thời gian chiếu với ${allSeatStatuses.length} seat status`,
      data: {
        created: createdShowtimes.length,
        duplicatesSkipped: duplicates.length,
        duplicates: duplicates,
        showtimes: populatedShowtimes
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Xóa thời gian chiếu theo khoảng ngày
// @route   DELETE /api/showtimes/bulk
// @access  Private (Admin)
exports.deleteShowtimesByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, movie, room } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp startDate và endDate'
      });
    }

    // Build filter query
    const filter = {
      date: { $gte: startDate, $lte: endDate }
    };

    // Add optional filters
    if (movie) filter.movie = movie;
    if (room) filter.room = room;

    // Get showtime IDs before deleting
    const showtimeIds = await ShowTime.find(filter).distinct('_id');

    // Xóa SeatStatus trước
    await SeatStatus.deleteMany({ showtime: { $in: showtimeIds } });

    // Xóa showtimes
    const result = await ShowTime.deleteMany(filter);

    res.status(200).json({
      success: true,
      message: `Đã xóa ${result.deletedCount} thời gian chiếu và dữ liệu liên quan`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};