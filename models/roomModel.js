const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên phòng']
  },
  cinema: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cinema',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true 
});

// Index để tối ưu query
RoomSchema.index({ cinema: 1, name: 1 }, { unique: true }); // Đảm bảo tên phòng unique trong cùng rạp

module.exports = mongoose.model('Room', RoomSchema);