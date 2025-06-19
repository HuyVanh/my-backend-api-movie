const mongoose = require('mongoose');

const CinemaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên rạp']
  },
  address: {
    type: String,
    required: [true, 'Vui lòng nhập địa chỉ']
  },
  hotline: {
    type: String
  }
});

module.exports = mongoose.model('Cinema', CinemaSchema);