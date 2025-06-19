const mongoose = require('mongoose');

const SeatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên ghế']
  },
  price: {
    type: Number,
    required: [true, 'Vui lòng nhập giá tiền']
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  }
});

module.exports = mongoose.model('Seat', SeatSchema);