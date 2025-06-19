// utils/emailService.js - Simple working version
const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASS } = require('../config/config');

// Tạo transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Gửi OTP email
const sendOTPEmail = async (email, otp) => {
  try {
    console.log('=== SENDING EMAIL ===');
    console.log('To:', email);
    console.log('OTP:', otp);
    console.log('From:', EMAIL_USER);
    
    const mailOptions = {
      from: `"Movie Booking App" <${EMAIL_USER}>`,
      to: email,
      subject: 'Mã xác thực OTP - Movie Booking',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #FFC107 0%, #FF9800 100%); padding: 30px; text-align: center;">
            <h1 style="color: #000; margin: 0; font-size: 28px;">🎬 Movie Booking</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 40px 30px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Mã xác thực OTP của bạn</h2>
            
            <div style="background: #000; color: #FFC107; padding: 20px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </div>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Vui lòng nhập mã này để hoàn tất đăng ký tài khoản.<br>
              <strong style="color: #e74c3c;">Mã có hiệu lực trong 10 phút.</strong>
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #999; font-size: 14px;">
                Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
              </p>
            </div>
          </div>
          
          <div style="background: #333; color: #fff; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© 2024 Movie Booking App. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 10 phút.`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Gửi email reset password
const sendResetPasswordEmail = async (email, resetToken) => {
  try {
    const mailOptions = {
      from: `"Movie Booking App" <${EMAIL_USER}>`,
      to: email,
      subject: 'Reset mật khẩu - Movie Booking',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #FFC107 0%, #FF9800 100%); padding: 30px; text-align: center;">
            <h1 style="color: #000; margin: 0; font-size: 28px;">🎬 Movie Booking</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 40px 30px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Reset mật khẩu</h2>
            
            <div style="background: #000; color: #FFC107; padding: 20px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${resetToken}
            </div>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Sử dụng mã này để reset mật khẩu của bạn.<br>
              <strong style="color: #e74c3c;">Mã có hiệu lực trong 15 phút.</strong>
            </p>
          </div>
          
          <div style="background: #333; color: #fff; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© 2024 Movie Booking App. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `Mã reset mật khẩu của bạn là: ${resetToken}. Mã có hiệu lực trong 15 phút.`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Reset email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Reset email sending failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendResetPasswordEmail
};