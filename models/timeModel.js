const mongoose = require('mongoose');

const TimeSchema = new mongoose.Schema({
  time: {
    type: String,
    required: [true, 'Vui lòng nhập thời gian']
  }
});

module.exports = mongoose.model('Time', TimeSchema);