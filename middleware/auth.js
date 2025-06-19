const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { JWT_SECRET } = require('../config/config');

// Protect routes - Kiểm tra token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Lấy token từ header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Hoặc từ cookie (nếu có)
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    // Kiểm tra token có tồn tại không
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Không có quyền truy cập, vui lòng đăng nhập'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Lấy thông tin user từ token
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Không tìm thấy người dùng với token này'
        });
      }

      // Kiểm tra trạng thái tài khoản
      if (user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'Tài khoản đã bị vô hiệu hóa'
        });
      }

      // Gán user vào request object
      req.user = user;
      next();
      
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Token không hợp lệ'
      });
    }
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server trong quá trình xác thực'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Kiểm tra user có role được phép không
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Role ${req.user.role} không có quyền truy cập tài nguyên này`
      });
    }
    next();
  };
};