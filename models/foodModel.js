const mongoose = require('mongoose');

const FoodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên đồ ăn/uống']
  },
  price: {
    type: Number,
    required: [true, 'Vui lòng nhập giá tiền']
  },
  image: {
    type: String
  },
  status: {
    type: String,
    enum: ['available', 'unavailable'],
    default: 'available'
  }
});

module.exports = mongoose.model('Food', FoodSchema);