const mongoose = require('mongoose');

const ActorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên diễn viên']
  },
  image: {
    type: String
  }
});

module.exports = mongoose.model('Actor', ActorSchema);