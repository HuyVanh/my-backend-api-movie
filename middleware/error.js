const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log lỗi
  console.log(err.stack);

  // Mongoose lỗi bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource không tìm thấy`;
    error = { message };
  }

  // Mongoose lỗi trùng khóa
  if (err.code === 11000) {
    const message = 'Giá trị trùng lặp đã được nhập vào';
    error = { message };
  }

  // Mongoose lỗi validation
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Lỗi server'
  });
};

module.exports = errorHandler;