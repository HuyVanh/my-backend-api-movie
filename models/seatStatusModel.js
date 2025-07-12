const mongoose = require('mongoose');

const SeatStatusSchema = new mongoose.Schema({
  seat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'booked', 'reserved'],
    default: 'available'
  },
  day: {
    type: Date,
    required: true
  },
  showtime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShowTime',
    required: true
  }
});

// Tạo index cho sự kết hợp độc nhất giữa seat, room, day và showtime
SeatStatusSchema.index({ seat: 1, room: 1, day: 1, showtime: 1 }, { unique: true });

module.exports = mongoose.model('SeatStatus', SeatStatusSchema);