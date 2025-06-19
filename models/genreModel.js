const mongoose = require('mongoose');

const GenreSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên thể loại'],
    unique: true
  },
  image: {
    type: String
  }
});

module.exports = mongoose.model('Genre', GenreSchema);