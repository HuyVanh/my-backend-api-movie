const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { 
  register, 
  registerAdmin,
  verifyEmailOTP,
  resendOTP,
  login, 
  logout,
  getMe,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register', [
  body('name').notEmpty().withMessage('Vui lòng nhập họ tên'),
  body('email').isEmail().withMessage('Vui lòng nhập email hợp lệ'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('number_phone').notEmpty().withMessage('Vui lòng nhập số điện thoại')
], register);

router.post('/verify-email', verifyEmailOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', [
  body('email').isEmail().withMessage('Vui lòng nhập email hợp lệ'),
  body('password').notEmpty().withMessage('Vui lòng nhập mật khẩu')
], login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
// Thêm route
router.post('/register-admin', [
  body('name').notEmpty().withMessage('Vui lòng nhập họ tên'),
  body('email').isEmail().withMessage('Vui lòng nhập email hợp lệ'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('number_phone').notEmpty().withMessage('Vui lòng nhập số điện thoại')
], registerAdmin);

module.exports = router;