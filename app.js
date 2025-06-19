require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { PORT, NODE_ENV } = require('./config/config');
const errorHandler = require('./middleware/error');

// Kết nối đến database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Mount routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/movies', require('./routes/movieRoutes'));
app.use('/api/cinemas', require('./routes/cinemaRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/seats', require('./routes/seatRoutes'));
app.use('/api/showtimes', require('./routes/showtimeRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/foods', require('./routes/foodRoutes'));
app.use('/api/discounts', require('./routes/discountRoutes'));
app.use('/api/directors', require('./routes/directorRoutes'));
app.use('/api/actors', require('./routes/actorRoutes'));
app.use('/api/genres', require('./routes/genreRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/seatstatus', require('./routes/seatStatusRoutes'));

// API chính
app.get('/', (req, res) => {
  res.json({ 
    message: 'Chào mừng đến với API đặt vé xem phim',
    version: '1.0.0',
    status: 'running'
  });
});

// Middleware xử lý lỗi (phải đặt cuối cùng)
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server đang chạy ở chế độ ${NODE_ENV} trên cổng ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}`);
});

// Xử lý lỗi không bắt được - unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Lỗi: ${err.message}`);
  // Đóng server & thoát process
  server.close(() => process.exit(1));
});

module.exports = app;