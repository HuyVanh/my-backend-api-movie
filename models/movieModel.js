const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  movie_id: {
    type: String,
    unique: true,
    sparse: true // Cho phép tự động tạo nếu không có
  },
  name: {
    type: String,
    required: [true, 'Tên phim là bắt buộc'],
    trim: true,
    maxlength: [200, 'Tên phim không được vượt quá 200 ký tự']
  },
  image: {
    type: String,
    trim: true
  },
  duration: {
    type: String, // Đổi từ Number sang String để phù hợp với TIME type
    required: [true, 'Thời lượng phim là bắt buộc']
  },
  director: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Director',
    required: false
  }],
  // ✨ THAY ĐỔI: Reference đến nhiều Genres
  genre: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Genre', 
    required: false
  }],
  spoken_language: { // ✅ ĐỔI TỪ 'language' THÀNH 'spoken_language'
    type: String,
    required: [true, 'Ngôn ngữ phim là bắt buộc'],
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  censorship: {
    type: String,
    trim: true,
    enum: ['G', 'PG', 'PG-13', 'R', 'NC-17', 'P', 'K', 'T13', 'T16', 'T18', 'C'], // Các loại phân loại phim
    default: 'P'
  },
  // Reference đến nhiều Actors (đã có sẵn)
  actor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Actor' // Mảng actors
  }],
  trailer: {
    type: String,
    trim: true // URL của trailer
  },
  rate: {
    type: Number,
    min: [0, 'Đánh giá không được nhỏ hơn 0'],
    max: [10, 'Đánh giá không được lớn hơn 10'],
    default: 0
  },
  storyLine: {
    type: String,
    trim: true,
    maxlength: [2000, 'Nội dung không được vượt quá 2000 ký tự']
  },
  release_date: {
    type: Date,
    default: Date.now
  },
  release_at: {
    type: String,
    trim: true 
  }
}, {
  timestamps: true, // Tự động tạo createdAt và updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ Index cho tìm kiếm nhanh - không còn conflict với 'language' field
movieSchema.index({ name: 'text', storyLine: 'text' });
movieSchema.index({ release_date: -1 });
movieSchema.index({ rate: -1 });
movieSchema.index({ genre: 1 });
movieSchema.index({ director: 1 });
movieSchema.index({ actor: 1 });

// ✨ THÊM MỚI: Virtual fields để hiển thị tên đầy đủ
movieSchema.virtual('directorNames').get(function() {
  if (!this.director || this.director.length === 0) return [];
  return this.director.map(dir => dir.name || dir).filter(Boolean);
});

movieSchema.virtual('actorNames').get(function() {
  if (!this.actor || this.actor.length === 0) return [];
  return this.actor.map(act => act.name || act).filter(Boolean);
});

movieSchema.virtual('genreNames').get(function() {
  if (!this.genre || this.genre.length === 0) return [];
  return this.genre.map(gen => gen.name || gen).filter(Boolean);
});

// Virtual field - format duration 
movieSchema.virtual('durationFormatted').get(function() {
  if (!this.duration) return null;
  // Nếu duration là string dạng "02:30:00" hoặc "150 minutes"
  return this.duration;
});

// ✨ THÊM MỚI: Virtual field để hiển thị thông tin đầy đủ
movieSchema.virtual('fullInfo').get(function() {
  return {
    directors: this.directorNames.join(', ') || 'Đang cập nhật',
    actors: this.actorNames.join(', ') || 'Đang cập nhật', 
    genres: this.genreNames.join(', ') || 'Đang cập nhật'
  };
});

// Pre-save middleware để tạo movie_id tự động
movieSchema.pre('save', async function(next) {
  if (!this.movie_id && this.isNew) {
    const count = await this.constructor.countDocuments();
    this.movie_id = `MOV${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// Method để validate duration format
movieSchema.methods.validateDuration = function() {
  if (!this.duration) return false;
  
  // Kiểm tra format HH:MM:SS hoặc số phút
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  const minutesRegex = /^\d+$/;
  
  return timeRegex.test(this.duration) || minutesRegex.test(this.duration);
};

// ✨ THÊM MỚI: Method để thêm actor/director/genre
movieSchema.methods.addActor = function(actorId) {
  if (!this.actor.includes(actorId)) {
    this.actor.push(actorId);
  }
  return this;
};

movieSchema.methods.addDirector = function(directorId) {
  if (!this.director.includes(directorId)) {
    this.director.push(directorId);
  }
  return this;
};

movieSchema.methods.addGenre = function(genreId) {
  if (!this.genre.includes(genreId)) {
    this.genre.push(genreId);
  }
  return this;
};

// ✨ THÊM MỚI: Method để xóa actor/director/genre
movieSchema.methods.removeActor = function(actorId) {
  this.actor = this.actor.filter(id => id.toString() !== actorId.toString());
  return this;
};

movieSchema.methods.removeDirector = function(directorId) {
  this.director = this.director.filter(id => id.toString() !== directorId.toString());
  return this;
};

movieSchema.methods.removeGenre = function(genreId) {
  this.genre = this.genre.filter(id => id.toString() !== genreId.toString());
  return this;
};

module.exports = mongoose.model('Movie', movieSchema);