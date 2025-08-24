const User = require('../models/userModel');
const Movie = require('../models/movieModel');
const Ticket = require('../models/ticketModel');
const ShowTime = require('../models/showTimeModel');
const Cinema = require('../models/cinemaModel'); // ✅ THÊM DÒNG NÀY
const mongoose = require('mongoose');

// ============ UTILITY FUNCTIONS (theo style của bạn) ============

const logInfo = (message, data = null) => {
  console.log(`ℹ️ [STATISTICS] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const logError = (message, error) => {
  console.error(`❌ [STATISTICS] ${message}:`, error);
};

const logSuccess = (message, data = null) => {
  console.log(`✅ [STATISTICS] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// ===========================================
// 🔥 API THỐNG KÊ TỔNG QUAN CHO DASHBOARD 
// ===========================================

// @desc    Lấy thống kê dashboard
// @route   GET /api/statistics/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    logInfo('GET DASHBOARD STATS - Start');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    logInfo('Date range:', { today, tomorrow });

    // 📊 1. THỐNG KÊ TỔNG QUAN
    const [
      totalUsers,
      activeMovies, 
      totalCinemas, // ✅ SỬA: Di chuyển totalCinemas lên đây
      todayTickets,
      todayRevenue
    ] = await Promise.all([
      // Tổng người dùng đang hoạt động (theo style bạn filter status)
      User.countDocuments({ status: 'active' }),
      
      // Phim đang chiếu (theo movieController của bạn)
      Movie.countDocuments({ status: 'active' }),
      
      // ✅ SỬA: Tổng rạp đang hoạt động 
      Cinema.countDocuments({ status: 'active' }),
      
      // Vé bán hôm nay (theo cách bạn handle status trong ticketController)
      Ticket.countDocuments({
        bookingTime: { $gte: today, $lt: tomorrow },
        status: { $in: ['completed', 'used'] }
      }),
      
      // Doanh thu hôm nay
      Ticket.aggregate([
        {
          $match: {
            bookingTime: { $gte: today, $lt: tomorrow },
            status: { $in: ['completed', 'used'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' }
          }
        }
      ])
    ]);

    // 📊 2. TOP PHIM BÁN CHẠY HÔM NAY (với populate theo style bạn)
    const topMoviesToday = await Ticket.aggregate([
      {
        $match: {
          bookingTime: { $gte: today, $lt: tomorrow },
          status: { $in: ['completed', 'used'] }
        }
      },
      {
        $group: {
          _id: '$movie',
          ticketCount: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { ticketCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movieInfo'
        }
      },
      {
        $project: {
          name: { $arrayElemAt: ['$movieInfo.name', 0] },
          image: { $arrayElemAt: ['$movieInfo.image', 0] },
          tickets: '$ticketCount',
          revenue: '$revenue'
        }
      }
    ]);

    // 📊 3. THỐNG KÊ THEO GIỜ HÔM NAY
    const hourlyStats = await Ticket.aggregate([
      {
        $match: {
          bookingTime: { $gte: today, $lt: tomorrow },
          status: { $in: ['completed', 'used'] }
        }
      },
      {
        $group: {
          _id: { $hour: '$bookingTime' },
          tickets: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    logSuccess(`Dashboard stats retrieved successfully`, {
      totalUsers,
      activeMovies,
      totalCinemas, // ✅ THÊM log cho totalCinemas
      todayTickets,
      todayRevenue: todayRevenue[0]?.totalRevenue || 0,
      topMovies: topMoviesToday.length,
      hourlyData: hourlyStats.length
    });

    // Trả response theo format của bạn
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeMovies,
          totalCinemas, // ✅ THÊM totalCinemas vào response
          todayTickets,
          todayRevenue: todayRevenue[0]?.totalRevenue || 0
        },
        topMoviesToday,
        hourlyStats
      }
    });

  } catch (error) {
    logError('getDashboardStats Error', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thống kê dashboard',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===========================================
// 📈 API THỐNG KÊ DOANH THU
// ===========================================

// @desc    Lấy thống kê doanh thu
// @route   GET /api/statistics/revenue
// @access  Private (Admin)
exports.getRevenueStats = async (req, res) => {
  try {
    logInfo('GET REVENUE STATS - Query params:', req.query);
    
    const { period = 'week', startDate, endDate } = req.query;
    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        bookingTime: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Tự động tạo filter theo period
      const now = new Date();
      switch (period) {
        case 'day':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          dateFilter = { bookingTime: { $gte: today, $lt: tomorrow } };
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = { bookingTime: { $gte: weekAgo } };
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = { bookingTime: { $gte: monthAgo } };
          break;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          dateFilter = { bookingTime: { $gte: yearAgo } };
          break;
      }
    }

    logInfo('Date filter:', dateFilter);

    // ✅ THÊM: Thống kê doanh thu theo rạp
    const cinemaRevenueData = await Ticket.aggregate([
      {
        $match: {
          ...dateFilter,
          status: { $in: ['completed', 'used'] }
        }
      },
      {
        $group: {
          _id: '$cinema',
          totalRevenue: { $sum: '$total' },
          ticketCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'cinemas',
          localField: '_id',
          foreignField: '_id',
          as: 'cinemaInfo'
        }
      },
      {
        $project: {
          name: { $arrayElemAt: ['$cinemaInfo.name', 0] },
          totalRevenue: 1,
          ticketCount: 1
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    const revenueData = await Ticket.aggregate([
      {
        $match: {
          ...dateFilter,
          status: { $in: ['completed', 'used'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$bookingTime' },
            month: { $month: '$bookingTime' },
            day: { $dayOfMonth: '$bookingTime' }
          },
          totalRevenue: { $sum: '$total' },
          ticketCount: { $sum: 1 },
          seatRevenue: { $sum: '$seatTotalPrice' },
          foodRevenue: { $sum: '$foodTotalPrice' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const summary = {
      totalRevenue: revenueData.reduce((sum, day) => sum + day.totalRevenue, 0),
      totalTickets: revenueData.reduce((sum, day) => sum + day.ticketCount, 0),
      avgRevenuePerDay: revenueData.length > 0 ? 
        revenueData.reduce((sum, day) => sum + day.totalRevenue, 0) / revenueData.length : 0
    };

    logSuccess(`Revenue stats retrieved for period: ${period}`, summary);

    res.status(200).json({
      success: true,
      data: {
        period,
        revenueData,
        cinemaRevenueData, // ✅ THÊM dữ liệu theo rạp
        summary
      }
    });

  } catch (error) {
    logError('getRevenueStats Error', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thống kê doanh thu',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ... (các method khác giữ nguyên)

// ===========================================
// 🎬 API THỐNG KÊ PHIM
// ===========================================

// @desc    Lấy thống kê phim
// @route   GET /api/statistics/movies
// @access  Private (Admin)
exports.getMovieStats = async (req, res) => {
  try {
    logInfo('GET MOVIE STATS - Query params:', req.query);
    
    const { period = 'month' } = req.query;
    
    // Tạo date filter
    const now = new Date();
    let dateFilter = {};
    
    switch (period) {
      case 'week':
        dateFilter = { 
          bookingTime: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
        };
        break;
      case 'month':
        dateFilter = { 
          bookingTime: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        };
        break;
      case 'all':
        dateFilter = {};
        break;
    }

    // Thống kê phim bán chạy (populate theo style ticketController)
    const movieStats = await Ticket.aggregate([
      {
        $match: {
          ...dateFilter,
          status: { $in: ['completed', 'used'] }
        }
      },
      {
        $group: {
          _id: '$movie',
          ticketsSold: { $sum: 1 },
          revenue: { $sum: '$total' },
          avgTicketPrice: { $avg: '$seatTotalPrice' }
        }
      },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movieInfo'
        }
      },
      {
        $project: {
          name: { $arrayElemAt: ['$movieInfo.name', 0] },
          image: { $arrayElemAt: ['$movieInfo.image', 0] },
          rate: { $arrayElemAt: ['$movieInfo.rate', 0] },
          ticketsSold: 1,
          revenue: 1,
          avgTicketPrice: { $round: ['$avgTicketPrice', 0] }
        }
      },
      { $sort: { ticketsSold: -1 } },
      { $limit: 10 }
    ]);

    logSuccess(`Movie stats retrieved for period: ${period}`, {
      totalMovies: movieStats.length,
      bestPerformer: movieStats[0]?.name || 'N/A'
    });

    res.status(200).json({
      success: true,
      data: {
        period,
        movieStats,
        summary: {
          totalMoviesWithSales: movieStats.length,
          bestPerformer: movieStats[0] || null
        }
      }
    });

  } catch (error) {
    logError('getMovieStats Error', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thống kê phim',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ... (các method còn lại giữ nguyên như code cũ)

// ===========================================
// 👥 API THỐNG KÊ NGƯỜI DÙNG  
// ===========================================

// @desc    Lấy thống kê người dùng
// @route   GET /api/statistics/users
// @access  Private (Admin)
exports.getUserStats = async (req, res) => {
  try {
    logInfo('GET USER STATS - Start');
    
    // Thống kê tổng quan users (theo cách filter của userController)
    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      usersByGender
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({
        createdAt: { 
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
        }
      }),
      User.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: '$gender',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Top khách hàng theo số vé mua (với transform data theo style ticketController)
    const topCustomers = await Ticket.aggregate([
      {
        $match: { 
          status: { $in: ['completed', 'used'] },
          user: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$user',
          ticketCount: { $sum: 1 },
          totalSpent: { $sum: '$total' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $project: {
          name: { $arrayElemAt: ['$userInfo.name', 0] },
          email: { $arrayElemAt: ['$userInfo.email', 0] },
          ticketCount: 1,
          totalSpent: 1
        }
      },
      { $sort: { ticketCount: -1 } },
      { $limit: 10 }
    ]);

    // Thống kê user mới theo tháng (6 tháng gần nhất)
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { 
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) 
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newUsers: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    logSuccess('User stats retrieved successfully', {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      topCustomers: topCustomers.length
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          newUsersThisMonth
        },
        usersByGender,
        topCustomers,
        userGrowth
      }
    });

  } catch (error) {
    logError('getUserStats Error', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thống kê người dùng',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===========================================
// 📊 API THỐNG KÊ CHI TIẾT
// ===========================================

// @desc    Lấy thống kê chi tiết
// @route   GET /api/statistics/detailed
// @access  Private (Admin)
exports.getDetailedStats = async (req, res) => {
  try {
    logInfo('GET DETAILED STATS - Query params:', req.query);
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp startDate và endDate'
      });
    }

    const dateFilter = {
      bookingTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    // Thống kê theo phương thức thanh toán
    const paymentMethodStats = await Ticket.aggregate([
      {
        $match: {
          ...dateFilter,
          status: { $in: ['completed', 'used'] }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      }
    ]);

    // Thống kê theo trạng thái vé
    const ticketStatusStats = await Ticket.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Thống kê combo đồ ăn bán chạy (handle foodItems array như trong ticketController)
    const foodStats = await Ticket.aggregate([
      {
        $match: {
          ...dateFilter,
          status: { $in: ['completed', 'used'] },
          'foodItems.0': { $exists: true }
        }
      },
      { $unwind: '$foodItems' },
      {
        $group: {
          _id: '$foodItems.food',
          totalQuantity: { $sum: '$foodItems.quantity' },
          totalRevenue: { $sum: { $multiply: ['$foodItems.quantity', '$foodItems.price'] } }
        }
      },
      {
        $lookup: {
          from: 'foods',
          localField: '_id',
          foreignField: '_id',
          as: 'foodInfo'
        }
      },
      {
        $project: {
          name: { $arrayElemAt: ['$foodInfo.name', 0] },
          totalQuantity: 1,
          totalRevenue: 1
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    logSuccess('Detailed stats retrieved successfully', {
      paymentMethods: paymentMethodStats.length,
      ticketStatuses: ticketStatusStats.length,
      topFoods: foodStats.length
    });

    res.status(200).json({
      success: true,
      data: {
        period: { startDate, endDate },
        paymentMethodStats,
        ticketStatusStats,
        foodStats
      }
    });

  } catch (error) {
    logError('getDetailedStats Error', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thống kê chi tiết',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===========================================
// 🎭 API THỐNG KÊ THEO SUẤT CHIẾU
// ===========================================

// @desc    Lấy thống kê theo suất chiếu
// @route   GET /api/statistics/showtimes/:showtimeId
// @access  Private (Admin)
exports.getShowtimeStats = async (req, res) => {
  try {
    const { showtimeId } = req.params;
    logInfo('Getting showtime stats for:', showtimeId);

    // Validate ObjectId (theo cách ticketController validate)
    if (!showtimeId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'ID suất chiếu không hợp lệ'
      });
    }

    const showtimeStats = await Ticket.aggregate([
      {
        $match: { 
          time: new mongoose.Types.ObjectId(showtimeId),
          status: { $in: ['completed', 'pending_payment', 'cancelled', 'used'] }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { 
            $sum: { 
              $cond: [
                { $in: ['$status', ['completed', 'used']] }, 
                '$total', 
                0 
              ] 
            } 
          }
        }
      }
    ]);

    // Lấy thông tin chi tiết suất chiếu
    const showtimeInfo = await ShowTime.findById(showtimeId)
      .populate('movie', 'name image duration')
      .populate('cinema', 'name address')
      .populate('room', 'name');

    if (!showtimeInfo) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy suất chiếu'
      });
    }

    const totalTickets = showtimeStats.reduce((sum, stat) => sum + stat.count, 0);
    const totalRevenue = showtimeStats.reduce((sum, stat) => sum + stat.revenue, 0);

    logSuccess(`Showtime stats retrieved for ${showtimeId}`, {
      totalTickets,
      totalRevenue
    });

    res.status(200).json({
      success: true,
      data: {
        showtimeInfo,
        stats: showtimeStats,
        summary: {
          totalTickets,
          totalRevenue,
          confirmed: showtimeStats.find(s => s._id === 'completed')?.count || 0,
          pending: showtimeStats.find(s => s._id === 'pending_payment')?.count || 0,
          cancelled: showtimeStats.find(s => s._id === 'cancelled')?.count || 0,
          used: showtimeStats.find(s => s._id === 'used')?.count || 0
        }
      }
    });

  } catch (error) {
    logError('getShowtimeStats Error', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thống kê suất chiếu',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===========================================
// 🔍 API DEBUG VÀ KIỂM TRA
// ===========================================

// @desc    Debug statistics data
// @route   GET /api/statistics/debug
// @access  Public (for debugging)
exports.debugStats = async (req, res) => {
  try {
    logInfo('DEBUG STATISTICS START');
    
    const totalTickets = await Ticket.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalMovies = await Movie.countDocuments();
    const totalCinemas = await Cinema.countDocuments();
    
    const sampleTickets = await Ticket.find().limit(3)
      .populate('movie', 'name')
      .populate('user', 'name email')
      .populate('cinema', 'name') // ✅ THÊM
      .lean();
    
    const statusDistribution = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const dateRangeStats = await Ticket.aggregate([
      {
        $group: {
          _id: null,
          oldestTicket: { $min: '$bookingTime' },
          newestTicket: { $max: '$bookingTime' }
        }
      }
    ]);

    logSuccess('Debug data collected');

    res.json({
      success: true,
      debug: {
        counts: {
          totalTickets,
          totalUsers, 
          totalMovies,
          totalCinemas // ✅ THÊM
        },
        statusDistribution,
        dateRange: dateRangeStats[0] || null,
        sampleTickets: sampleTickets.map(t => ({
          orderId: t.orderId,
          movie: t.movie?.name || 'N/A',
          cinema: t.cinema?.name || 'N/A', // ✅ THÊM
          user: t.user?.name || t.userInfo?.fullName || 'Guest',
          status: t.status,
          total: t.total,
          bookingTime: t.bookingTime
        }))
      }
    });
    
  } catch (error) {
    logError('Debug error', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi debug statistics',
      details: error.message
    });
  }
};
// Thêm API debug riêng cho Cinema
// @desc    Debug cinema data
// @route   GET /api/statistics/debug-cinema
// @access  Private (Admin)
exports.debugCinemaStats = async (req, res) => {
  try {
    logInfo('DEBUG CINEMA STATS START');

    // 1. Đếm tổng số cinema (không filter)
    const totalCinemasAll = await Cinema.countDocuments();
    
    // 2. Đếm cinema theo status
    const cinemasByStatus = await Cinema.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. Lấy sample cinema data
    const sampleCinemas = await Cinema.find().limit(10).lean();

    // 4. Đếm cinema có trong tickets (có giao dịch)
    const cinemasWithTickets = await Ticket.aggregate([
      {
        $group: { _id: '$cinema' }
      },
      { $count: 'totalCinemas' }
    ]);

    // 5. Chi tiết cinema nào có bán vé
    const cinemaTicketDetails = await Ticket.aggregate([
      {
        $group: {
          _id: '$cinema',
          ticketCount: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      {
        $lookup: {
          from: 'cinemas',
          localField: '_id',
          foreignField: '_id',
          as: 'cinemaInfo'
        }
      },
      {
        $project: {
          cinemaName: { $arrayElemAt: ['$cinemaInfo.name', 0] },
          cinemaStatus: { $arrayElemAt: ['$cinemaInfo.status', 0] },
          ticketCount: 1,
          revenue: 1
        }
      }
    ]);

    // 6. Cinema không có trong tickets
    const allCinemaIds = sampleCinemas.map(c => c._id);
    const cinemasInTickets = cinemaTicketDetails.map(c => c._id.toString());
    const cinemasWithoutTickets = sampleCinemas.filter(
      cinema => !cinemasInTickets.includes(cinema._id.toString())
    );

    logSuccess('Cinema debug data collected');

    res.json({
      success: true,
      debug: {
        // Tổng số cinema
        totalCinemasAll,
        
        // Phân bố theo status
        cinemasByStatus,
        
        // Cinema có giao dịch
        cinemasWithTickets: cinemasWithTickets[0]?.totalCinemas || 0,
        
        // Chi tiết cinema có vé
        cinemaTicketDetails,
        
        // Cinema không có vé
        cinemasWithoutTickets: cinemasWithoutTickets.map(c => ({
          id: c._id,
          name: c.name,
          status: c.status
        })),
        
        // Sample data
        sampleCinemas: sampleCinemas.map(c => ({
          id: c._id,
          name: c.name,
          status: c.status,
          address: c.address
        })),
        
        // Kết luận
        analysis: {
          totalInDatabase: totalCinemasAll,
          activeCinemas: cinemasByStatus.find(s => s._id === 'active')?.count || 0,
          cinemasWithSales: cinemasWithTickets[0]?.totalCinemas || 0,
          cinemasWithoutSales: cinemasWithoutTickets.length
        }
      }
    });
    
  } catch (error) {
    logError('Debug cinema error', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi debug cinema statistics',
      details: error.message
    });
  }
};