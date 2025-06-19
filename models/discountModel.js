const mongoose = require('mongoose');

const DiscountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên khuyến mãi']
  },
  percent: {
    type: Number,
    required: [true, 'Vui lòng nhập phần trăm giảm giá']
  },
  code: {
    type: String,
    required: [true, 'Vui lòng nhập mã khuyến mãi'],
    unique: true
  },
  type: {
    type: String,
    enum: ['movie', 'ticket', 'food', 'combo'],
    default: 'ticket'
  },
  cinema: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cinema'
  },
  dayStart: {
    type: Date,
    required: [true, 'Vui lòng nhập ngày bắt đầu']
  },
  dayEnd: {
    type: Date,
    required: [true, 'Vui lòng nhập ngày kết thúc']
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
});

module.exports = mongoose.model('Discount', DiscountSchema);