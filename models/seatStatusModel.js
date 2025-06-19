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
    type: String,
    required: true
  },
  time: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Time',
    required: true
  }
});

// Tạo index cho sự kết hợp độc nhất giữa seat, room, day và time
SeatStatusSchema.index({ seat: 1, room: 1, day: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('SeatStatus', SeatStatusSchema);