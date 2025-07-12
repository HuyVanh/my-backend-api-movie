const User = require('../models/userModel');
const { validationResult } = require('express-validator');
const { sendOTPEmail, sendResetPasswordEmail } = require('../utils/emailService');

// Helper function để gửi token response
const sendTokenResponse = (user, statusCode, res) => {
  try {
    console.log('=== SEND TOKEN DEBUG ===');
    console.log('User ID:', user._id);
    
    const token = user.getSignedJwtToken();
    console.log('Token created successfully');
    
    res.status(statusCode).json({
      success: true,
      token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        number_phone: user.number_phone,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        role: user.role,
        status: user.status,
        email_verify: user.email_verify,
        createdAt: user.createdAt
      }
    });
    
  } catch (error) {
    console.error('Send token response error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi tạo token response: ' + error.message
    });
  }
};

// @desc    Đăng ký người dùng - IMPROVED
// @route   POST /api/auth/register  
// @access  Public
exports.register = async (req, res) => {
  try {
    console.log('=== REGISTER START ===');
    console.log('Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, password, number_phone, date_of_birth, gender } = req.body;

    // Check existing user (email OR phone)
    console.log('Checking existing user...');
    const existingUser = await User.findOne({
      $or: [{ email }, { number_phone }]
    });
    
    if (existingUser) {
      console.log('User already exists');
      
      // If existing user hasn't verified email yet
      if (!existingUser.email_verify && existingUser.email === email) {
        console.log('Existing user not verified, updating OTP');
        
        // Generate new OTP for existing unverified user
        const otp = Math.floor(100000 + Math.random() * 900000);
        existingUser.emailOTP = otp;
        existingUser.otpExpires = Date.now() + 10 * 60 * 1000;
        await existingUser.save();
        
        console.log('Updated OTP for existing user:', otp);
        
        // Try to send email
        const emailResult = await sendOTPEmail(email, otp);
        
        return res.status(200).json({
          success: true,
          requiresEmailVerification: true,
          message: 'OTP mới đã được tạo cho tài khoản chưa xác thực.',
          email: email,
          warning: emailResult.success ? null : 'Email sending failed',
          testOTP: emailResult.success ? undefined : otp
        });
      }
      
      // User already verified or phone duplicate
      const field = existingUser.email === email ? 'Email' : 'Số điện thoại';
      return res.status(400).json({
        success: false,
        error: `${field} đã được đăng ký`
      });
    }

    // Create new user
    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log('Generated OTP:', otp);

    console.log('Creating new user...');
    const user = await User.create({
      name,
      email,
      password,
      number_phone,
      date_of_birth,
      gender,
      emailOTP: otp,
      otpExpires: Date.now() + 10 * 60 * 1000,
      email_verify: false
    });

    console.log('User created successfully:', user._id);
    
    // Try to send email
    console.log('Sending OTP email...');
    const emailResult = await sendOTPEmail(email, otp);
    
    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return res.status(201).json({
        success: true,
        statusCode: 201,
        requiresEmailVerification: true,
        message: 'Tài khoản đã được tạo nhưng có lỗi gửi email. Vui lòng sử dụng chức năng gửi lại OTP.',
        email: email,
        warning: 'Email sending failed',
        testOTP: otp // For debugging when email fails
      });
    }
    
    console.log('Email sent successfully');
    
    res.status(201).json({
      success: true,
      statusCode: 201,
      requiresEmailVerification: true,
      message: 'Tài khoản đã được tạo. Vui lòng kiểm tra email để xác thực OTP.',
      email: email
    });
    
  } catch (err) {
    console.error('=== REGISTER ERROR ===');
    console.error('Error:', err);
    
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field === 'email' ? 'Email' : 'Số điện thoại'} đã được đăng ký`
      });
    }

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng ký: ' + err.message
    });
  }
};

// @desc    Gửi lại OTP - SINGLE VERSION
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    console.log('=== RESEND OTP START ===');
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập email'
      });
    }
    
    const user = await User.findOne({ 
      email,
      email_verify: false 
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản cần xác thực với email này'
      });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000);
    
    user.emailOTP = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    
    console.log(`New OTP for ${email}: ${otp}`);
    
    // Try to send email
    const emailResult = await sendOTPEmail(email, otp);
    
    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return res.status(500).json({
        success: false,
        error: 'Không thể gửi email OTP. Vui lòng thử lại sau.',
        warning: 'Email sending failed',
        testOTP: otp // For debugging
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Mã OTP mới đã được gửi đến email của bạn'
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi gửi lại OTP'
    });
  }
};

// @desc    Xác thực OTP email
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmailOTP = async (req, res) => {
  try {
    console.log('=== VERIFY OTP START ===');
    const { email, otp, userData } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập email và mã OTP'
      });
    }

    console.log('Verifying OTP for:', email, 'OTP:', otp);

    const user = await User.findOne({ 
      email,
      emailOTP: otp,
      otpExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Mã OTP không hợp lệ hoặc đã hết hạn'
      });
    }
    
    // Activate account
    user.email_verify = true;
    user.emailOTP = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    console.log('Email verified successfully for user:', user._id);
    
    sendTokenResponse(user, 200, res);
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xác thực OTP'
    });
  }
};

// @desc    Đăng nhập người dùng
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    console.log('=== LOGIN START ===');
    const { email, password } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập email và mật khẩu'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc mật khẩu không chính xác'
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc mật khẩu không chính xác'
      });
    }

    if (!user.email_verify) {
      return res.status(401).json({
        success: false,
        error: 'Vui lòng xác thực email trước khi đăng nhập',
        requiresEmailVerification: true,
        email: user.email
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    sendTokenResponse(user, 200, res);
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng nhập: ' + err.message
    });
  }
};

// @desc    Đăng xuất người dùng
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công'
    });
    
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng xuất'
    });
  }
};

// @desc    Lấy thông tin người dùng hiện tại
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thông tin người dùng'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thông tin người dùng'
    });
  }
};

// @desc    Quên mật khẩu
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập email'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản với email này'
      });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    console.log(`Reset token for ${email}: ${resetToken}`);

    // Try to send email
    const emailResult = await sendResetPasswordEmail(email, resetToken);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Không thể gửi email reset. Vui lòng thử lại sau.',
        testResetToken: resetToken // For debugging
      });
    }

    res.status(200).json({
      success: true,
      message: 'Link reset mật khẩu đã được gửi đến email của bạn'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xử lý quên mật khẩu'
    });
  }
};

// @desc    Reset mật khẩu
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    const user = await User.findOne({
      email,
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token reset không hợp lệ hoặc đã hết hạn'
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Mật khẩu đã được reset thành công'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi reset mật khẩu'
    });
  }
};
// @desc    Đăng ký admin
// @route   POST /api/auth/register-admin
// @access  Public (hoặc Protected tùy yêu cầu)
exports.registerAdmin = async (req, res) => {
  try {
    console.log('=== REGISTER ADMIN START ===');
    console.log('Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, password, number_phone, date_of_birth, gender } = req.body;

    // Check existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { number_phone }]
    });
    
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Số điện thoại';
      return res.status(400).json({
        success: false,
        error: `${field} đã được đăng ký`
      });
    }

    // Create admin user (không cần OTP verification)
    const adminUser = await User.create({
      name,
      email,
      password,
      number_phone,
      date_of_birth,
      gender,
      role: 'admin',
      email_verify: true // Admin tự động verify
    });

    console.log('Admin created successfully:', adminUser._id);
    
    sendTokenResponse(adminUser, 201, res);
    
  } catch (err) {
    console.error('=== REGISTER ADMIN ERROR ===');
    console.error('Error:', err);
    
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field === 'email' ? 'Email' : 'Số điện thoại'} đã được đăng ký`
      });
    }

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi tạo admin: ' + err.message
    });
  }
};