// routes/employeeRoutes.js
const express = require('express');
const {
  // Authentication
  loginEmployee,
  
  // Profile Management
  getEmployeeProfile,
  updateEmployeeProfile,
  changeEmployeePassword,
  
  // Employee Management (Admin/Manager)
  registerEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployeeWorkInfo,
  deleteEmployee,
  getEmployeeStats
} = require('../controllers/employeeController');

// Import middleware
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// =====================================
// PUBLIC ROUTES
// =====================================

// @route   POST /api/employees/login
// @desc    Đăng nhập nhân viên
// @access  Public
router.post('/login', loginEmployee);

// =====================================
// PROTECTED ROUTES - Cần authentication
// =====================================
router.use(protect); // Tất cả routes bên dưới cần token

// =====================================
// EMPLOYEE PROFILE ROUTES
// =====================================

// @route   GET /api/employees/profile
// @desc    Lấy thông tin profile nhân viên hiện tại
// @access  Private (Employee)
router.get('/profile', getEmployeeProfile);

// @route   PUT /api/employees/profile
// @desc    Cập nhật thông tin cá nhân nhân viên
// @access  Private (Employee)
router.put('/profile', updateEmployeeProfile);

// @route   PUT /api/employees/change-password
// @desc    Đổi mật khẩu nhân viên
// @access  Private (Employee)
router.put('/change-password', changeEmployeePassword);

// =====================================
// MANAGEMENT ROUTES - Chỉ Admin/Manager
// =====================================

// @route   GET /api/employees/stats
// @desc    Thống kê nhân viên
// @access  Private (Admin/Manager)
router.get('/stats', authorize('admin', 'manager'), getEmployeeStats);

// @route   GET /api/employees
// @desc    Lấy danh sách tất cả nhân viên
// @access  Private (Admin/Manager)
router.get('/', authorize('admin', 'manager'), getAllEmployees);

// @route   POST /api/employees/register
// @desc    Tạo nhân viên mới
// @access  Private (Admin/Manager)
router.post('/register', authorize('admin', 'manager'), registerEmployee);

// @route   GET /api/employees/:id
// @desc    Lấy thông tin nhân viên theo ID
// @access  Private (Admin/Manager)
router.get('/:id', authorize('admin', 'manager'), getEmployeeById);

// @route   PUT /api/employees/:id/work-info
// @desc    Cập nhật thông tin công việc nhân viên
// @access  Private (Admin/Manager)
router.put('/:id/work-info', authorize('admin', 'manager'), updateEmployeeWorkInfo);

// =====================================
// ADMIN ONLY ROUTES
// =====================================

// @route   DELETE /api/employees/:id
// @desc    Xóa nhân viên (soft delete)
// @access  Private (Admin only)
router.delete('/:id', authorize('admin'), deleteEmployee);

module.exports = router;