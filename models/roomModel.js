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
  }
});

module.exports = mongoose.model('Room', RoomSchema);