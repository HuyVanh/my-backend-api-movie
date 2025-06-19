const mongoose = require('mongoose');

const ShowTimeSchema = new mongoose.Schema({
  time: {
    type: String,
    required: [true, 'Vui lòng nhập thời gian']
  },
  date: {
    type: String,
    required: [true, 'Vui lòng nhập ngày']
  }
});

module.exports = mongoose.model('ShowTime', ShowTimeSchema);