const mongoose = require('mongoose');

const DirectorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên đạo diễn']
  },
  image: {
    type: String
  }
});

module.exports = mongoose.model('Director', DirectorSchema);