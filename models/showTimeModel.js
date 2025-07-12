const mongoose = require('mongoose');

const ShowTimeSchema = new mongoose.Schema({
  time: {
    type: Date,
    required: [true, 'Vui lòng nhập thời gian']
  },
  date: {
    type: Date,
    required: [true, 'Vui lòng nhập ngày']
  },
  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  cinema: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cinema',
    required: true
  }
});

module.exports = mongoose.model('ShowTime', ShowTimeSchema);