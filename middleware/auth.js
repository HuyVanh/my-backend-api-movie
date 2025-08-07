// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { JWT_SECRET } = require('../config/config');

// =====================================
// BASIC AUTHENTICATION
// =====================================

// @desc    Protect routes - Kiểm tra JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    console.log('=== PROTECT MIDDLEWARE ===');
    
    // Lấy token từ header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token from Bearer header');
    }
    // Hoặc từ cookie (nếu có)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Token from cookie');
    }

    // Kiểm tra token có tồn tại không
    if (!token) {
      console.log('No token found');
      return res.status(401).json({
        success: false,
        error: 'Không có quyền truy cập, vui lòng đăng nhập'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('Token verified for user:', decoded.id);
      
      // Lấy thông tin user từ token
      const user = await User.findById(decoded.id);
      
      if (!user) {
        console.log('User not found');
        return res.status(401).json({
          success: false,
          error: 'Không tìm thấy người dùng với token này'
        });
      }

      // Kiểm tra trạng thái tài khoản
      if (user.status !== 'active') {
        console.log('User account inactive');
        return res.status(401).json({
          success: false,
          error: 'Tài khoản đã bị vô hiệu hóa'
        });
      }

      console.log('User authenticated:', user.email, 'Role:', user.role);
      
      // Gán user vào request object
      req.user = user;
      next();
      
    } catch (err) {
      console.log('Token verification failed:', err.message);
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

// =====================================
// ROLE-BASED AUTHORIZATION
// =====================================

// @desc    Kiểm tra quyền theo role
const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('=== AUTHORIZE MIDDLEWARE ===');
    console.log('Required roles:', roles);
    console.log('User role:', req.user.role);
    
    if (!roles.includes(req.user.role)) {
      console.log('Authorization failed');
      return res.status(403).json({
        success: false,
        error: `Role '${req.user.role}' không có quyền truy cập tài nguyên này`
      });
    }
    
    console.log('Authorization successful');
    next();
  };
};

// =====================================
// EMPLOYEE-SPECIFIC MIDDLEWARE
// =====================================

// @desc    Kiểm tra user có phải employee không
const requireEmployee = (req, res, next) => {
  console.log('=== REQUIRE EMPLOYEE MIDDLEWARE ===');
  console.log('User role:', req.user.role);
  
  // Kiểm tra role
  if (req.user.role !== 'employee') {
    return res.status(403).json({
      success: false,
      error: 'Chỉ nhân viên mới có thể truy cập tính năng này'
    });
  }

  // Kiểm tra có thông tin employee không
  if (!req.user.employee || !req.user.employee.employee_id) {
    return res.status(403).json({
      success: false,
      error: 'Thông tin nhân viên không hợp lệ'
    });
  }

  // Kiểm tra work_status
  if (req.user.employee.work_status !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'Nhân viên không còn hoạt động'
    });
  }

  console.log('Employee check passed:', req.user.employee.employee_id);
  next();
};

// @desc    Kiểm tra quyền quản lý (admin hoặc manager)
const requireManager = (req, res, next) => {
  console.log('=== REQUIRE MANAGER MIDDLEWARE ===');
  console.log('User role:', req.user.role);
  
  const managerRoles = ['admin', 'manager'];
  
  if (!managerRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Chỉ admin hoặc manager mới có quyền truy cập'
    });
  }

  // Nếu là manager employee, kiểm tra thêm work_status
  if (req.user.role === 'manager' && req.user.employee) {
    if (req.user.employee.work_status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Manager không còn hoạt động'
      });
    }
  }

  console.log('Manager check passed');
  next();
};

// @desc    Kiểm tra quyền theo position
const requirePosition = (...positions) => {
  return (req, res, next) => {
    console.log('=== REQUIRE POSITION MIDDLEWARE ===');
    console.log('Required positions:', positions);
    console.log('User position:', req.user.employee?.position);
    
    // Kiểm tra có phải employee không
    if (req.user.role !== 'employee' || !req.user.employee) {
      return res.status(403).json({
        success: false,
        error: 'Chỉ nhân viên mới có thể truy cập'
      });
    }

    // Kiểm tra position
    if (!positions.includes(req.user.employee.position)) {
      return res.status(403).json({
        success: false,
        error: `Chỉ ${positions.join(', ')} mới có quyền truy cập`
      });
    }

    console.log('Position check passed');
    next();
  };
};

// @desc    Kiểm tra quyền theo department
const requireDepartment = (...departments) => {
  return (req, res, next) => {
    console.log('=== REQUIRE DEPARTMENT MIDDLEWARE ===');
    console.log('Required departments:', departments);
    console.log('User department:', req.user.employee?.department);
    
    // Kiểm tra có phải employee không
    if (req.user.role !== 'employee' || !req.user.employee) {
      return res.status(403).json({
        success: false,
        error: 'Chỉ nhân viên mới có thể truy cập'
      });
    }

    // Kiểm tra department
    if (!departments.includes(req.user.employee.department)) {
      return res.status(403).json({
        success: false,
        error: `Chỉ phòng ban ${departments.join(', ')} mới có quyền truy cập`
      });
    }

    console.log('Department check passed');
    next();
  };
};

// =====================================
// PERMISSION-BASED MIDDLEWARE
// =====================================

// @desc    Kiểm tra employee có thể quản lý employee khác không
const canManageEmployee = async (req, res, next) => {
  try {
    console.log('=== CAN MANAGE EMPLOYEE MIDDLEWARE ===');
    
    const targetEmployeeId = req.params.id;
    const currentUserId = req.user.id;
    
    console.log('Target employee ID:', targetEmployeeId);
    console.log('Current user ID:', currentUserId);
    console.log('Current user role:', req.user.role);

    // Admin có thể quản lý tất cả
    if (req.user.role === 'admin') {
      console.log('Admin access granted');
      return next();
    }

    // Manager có thể quản lý employee trong cùng department
    if (req.user.role === 'manager' && req.user.employee) {
      // Lấy thông tin target employee để check department
      const targetEmployee = await User.findById(targetEmployeeId);
      
      if (!targetEmployee || targetEmployee.role !== 'employee') {
        return res.status(404).json({
          success: false,
          error: 'Không tìm thấy nhân viên'
        });
      }

      // Manager chỉ quản lý được employee cùng department
      if (req.user.employee.department === targetEmployee.employee.department) {
        console.log('Manager department access granted');
        return next();
      } else {
        return res.status(403).json({
          success: false,
          error: 'Manager chỉ có thể quản lý nhân viên trong cùng phòng ban'
        });
      }
    }

    // Employee chỉ có thể quản lý thông tin của chính mình
    if (req.user.role === 'employee') {
      if (targetEmployeeId === currentUserId) {
        console.log('Self-management access granted');
        return next();
      } else {
        return res.status(403).json({
          success: false,
          error: 'Bạn chỉ có thể quản lý thông tin của chính mình'
        });
      }
    }

    // Các role khác không có quyền
    return res.status(403).json({
      success: false,
      error: 'Không có quyền quản lý nhân viên'
    });

  } catch (error) {
    console.error('Can manage employee error:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server khi kiểm tra quyền'
    });
  }
};

// @desc    Kiểm tra chỉ cho phép admin
const requireAdmin = (req, res, next) => {
  console.log('=== REQUIRE ADMIN MIDDLEWARE ===');
  console.log('User role:', req.user.role);
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Chỉ admin mới có quyền truy cập'
    });
  }
  
  console.log('Admin check passed');
  next();
};

// =====================================
// EXPORTS
// =====================================

module.exports = {
  protect,
  authorize,
  requireEmployee,
  requireManager,
  requirePosition,
  requireDepartment,
  canManageEmployee,
  requireAdmin
};