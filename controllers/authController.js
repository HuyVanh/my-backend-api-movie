const User = require('../models/userModel');
const { validationResult } = require('express-validator');
const { sendOTPEmail, sendResetPasswordEmail } = require('../utils/emailService'); // Import email service

// Helper function để gửi token response
const sendTokenResponse = (user, statusCode, res) => {
  try {
    console.log('=== SEND TOKEN DEBUG ===');
    console.log('User ID:', user._id);
    
    // Tạo token
    const token = user.getSignedJwtToken();
    console.log('Token created successfully');
    
    // Response với token
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

// @desc    Đăng ký người dùng
// @route   POST /api/auth/register  
// @access  Public
exports.register = async (req, res) => {
  try {
    console.log('=== REGISTER START ===');
    console.log('Request body:', req.body);
    
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, password, number_phone, date_of_birth, gender } = req.body;

    // Kiểm tra email đã tồn tại
    console.log('Checking if email exists:', email);
    let user = await User.findOne({ email });
    
    if (user) {
      console.log('Email already exists');
      return res.status(400).json({
        success: false,
        error: 'Email đã được đăng ký'
      });
    }

    // Kiểm tra số điện thoại đã tồn tại
    console.log('Checking if phone exists:', number_phone);
    let phoneUser = await User.findOne({ number_phone });
    
    if (phoneUser) {
      console.log('Phone already exists');
      return res.status(400).json({
        success: false,
        error: 'Số điện thoại đã được đăng ký'
      });
    }

    // Tạo OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log('Generated OTP:', otp);

    // Tạo người dùng mới với OTP
    console.log('Creating new user...');
    user = await User.create({
      name,
      email,
      password,
      number_phone,
      date_of_birth,
      gender,
      emailOTP: otp,
      otpExpires: Date.now() + 10 * 60 * 1000, // 10 phút
      email_verify: false // Chưa xác thực
    });

    console.log('User created successfully:', user._id);
    
    // Gửi email OTP thực tế
    console.log('Sending OTP email...');
    const emailResult = await sendOTPEmail(email, otp);
    
    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      // Vẫn trả về success nhưng với warning
      return res.status(201).json({
        success: true,
        requiresEmailVerification: true,
        message: 'Tài khoản đã được tạo nhưng có lỗi gửi email. Vui lòng sử dụng chức năng gửi lại OTP.',
        email: email,
        warning: 'Email sending failed',
        testOTP: otp // Để debug khi email fail
      });
    }
    
    console.log('Email sent successfully');
    
    // Trả về response yêu cầu verify email
    res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      message: 'Tài khoản đã được tạo. Vui lòng kiểm tra email để xác thực OTP.',
      email: email
      // Không trả testOTP khi email gửi thành công
    });
    
  } catch (err) {
    console.error('=== REGISTER ERROR ===');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Full error:', err);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field === 'email' ? 'Email' : 'Số điện thoại'} đã được đăng ký`
      });
    }

    // Handle validation errors
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

// @desc    Gửi lại OTP
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
    
    // Tìm user chưa verify
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
    
    // Tạo OTP mới
    const otp = Math.floor(100000 + Math.random() * 900000);
    
    // Cập nhật OTP mới
    user.emailOTP = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 phút
    await user.save();
    
    console.log(`New OTP for ${email}: ${otp}`);
    
    // Gửi email OTP thực tế
    const emailResult = await sendOTPEmail(email, otp);
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Không thể gửi email OTP. Vui lòng thử lại sau.',
        testOTP: otp // Để debug
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

    // Tìm user với email và OTP còn hiệu lực
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
    
    // Kích hoạt tài khoản
    user.email_verify = true;
    user.emailOTP = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    console.log('Email verified successfully for user:', user._id);
    
    // Gửi token response sau khi verify thành công
    sendTokenResponse(user, 200, res);
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xác thực OTP'
    });
  }
};

// @desc    Gửi lại OTP
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
    
    // Tìm user chưa verify
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
    
    // Tạo OTP mới
    const otp = Math.floor(100000 + Math.random() * 900000);
    
    // Cập nhật OTP mới
    user.emailOTP = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 phút
    await user.save();
    
    console.log(`New OTP for ${email}: ${otp}`);
    
    // TODO: Gửi email OTP thực tế
    // await sendOTPEmail(email, otp);
    
    res.status(200).json({
      success: true,
      message: 'Mã OTP mới đã được gửi đến email của bạn',
      // Chỉ để test
      testOTP: otp
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi gửi lại OTP'
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

    // Validation
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

    // Tìm user và include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc mật khẩu không chính xác'
      });
    }

    // Kiểm tra mật khẩu
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc mật khẩu không chính xác'
      });
    }

    // Kiểm tra tài khoản đã được verify chưa
    if (!user.email_verify) {
      return res.status(401).json({
        success: false,
        error: 'Vui lòng xác thực email trước khi đăng nhập',
        requiresEmailVerification: true,
        email: user.email
      });
    }

    // Kiểm tra trạng thái tài khoản
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
    // Với JWT, client sẽ xóa token
    // Server có thể implement blacklist token nếu cần
    
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

// @desc    Lấy thông tin người dùng hiện tại (từ token)
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    // req.user được set từ auth middleware
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

// @desc    Quên mật khẩu - Gửi email reset
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

    // Tạo reset token
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Lưu reset token vào database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 phút
    await user.save();

    console.log(`Reset token for ${email}: ${resetToken}`);

    // TODO: Gửi email reset password thực tế
    // await sendResetPasswordEmail(email, resetToken);

    res.status(200).json({
      success: true,
      message: 'Link reset mật khẩu đã được gửi đến email của bạn',
      // Chỉ để test
      testResetToken: resetToken
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

    // Tìm user với reset token còn hiệu lực
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

    // Cập nhật mật khẩu mới
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