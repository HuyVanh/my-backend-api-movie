// utils/emailService.js - ĐÃ SỬA LỖI createTransport
const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASS } = require('../config/config');

const sendOTPEmail = async (email, otp) => {
  try {
    console.log('=== ĐANG GỬI EMAIL OTP THẬT ===');
    console.log('Gửi đến:', email);
    console.log('OTP:', otp);
    console.log('Từ:', EMAIL_USER);
    console.log('App Password length:', EMAIL_PASS ? EMAIL_PASS.replace(/\s/g, '').length : 0);
    
    // Kiểm tra config
    if (!EMAIL_USER || !EMAIL_PASS) {
      throw new Error('Thiếu EMAIL_USER hoặc EMAIL_PASS trong .env');
    }
    
    // Tạo Gmail transporter - SỬA LỖI: createTransport không phải createTransporter
    console.log('🔄 Kết nối Gmail với App Password mới...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: true,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS, // App Password: gfnf omxa uvbc zyio
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Test connection trước khi gửi
    console.log('🔍 Verify Gmail connection...');
    await transporter.verify();
    console.log('✅ Gmail connection SUCCESS!');
    
    // Tạo nội dung email đẹp
    const mailOptions = {
      from: `"🎬 Ứng dụng Đặt Vé Phim" <${EMAIL_USER}>`,
      to: email,
      subject: '🎯 Mã xác thực OTP - Đặt vé phim',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mã OTP - Đặt vé phim</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
          
          <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            
            <!-- Header với gradient đẹp -->
            <div style="background: linear-gradient(135deg, #FFC107 0%, #FF9800 50%, #FF5722 100%); padding: 40px 30px; text-align: center; position: relative;">
              <div style="background: rgba(255,255,255,0.1); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px;">🎬</span>
              </div>
              <h1 style="color: #000; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">Đặt Vé Phim</h1>
              <p style="color: #333; margin: 15px 0 0 0; font-size: 16px; opacity: 0.8;">Ứng dụng đặt vé xem phim trực tuyến</p>
            </div>
            
            <!-- Content chính -->
            <div style="padding: 50px 40px;">
              
              <h2 style="color: #333; margin: 0 0 25px 0; text-align: center; font-size: 24px;">Chào mừng bạn! 👋</h2>
              
              <p style="color: #666; font-size: 16px; margin-bottom: 30px; text-align: center;">
                Cảm ơn bạn đã đăng ký tài khoản. Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã OTP bên dưới:
              </p>
              
              <!-- OTP Box với hiệu ứng đẹp -->
              <div style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); margin: 40px 0; border-radius: 20px; padding: 0; position: relative; overflow: hidden;">
                <div style="background: linear-gradient(45deg, #FFC107, #FF9800); padding: 3px; border-radius: 20px;">
                  <div style="background: #000; border-radius: 17px; padding: 30px; text-align: center;">
                    <p style="color: #FFC107; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Mã OTP của bạn</p>
                    <div style="color: #FFC107; font-size: 42px; font-weight: bold; letter-spacing: 12px; font-family: 'Courier New', monospace; text-shadow: 0 0 20px rgba(255, 193, 7, 0.3);">
                      ${otp}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Thông tin quan trọng -->
              <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 2px solid #FFC107; border-radius: 15px; padding: 25px; margin: 30px 0; position: relative;">
                <div style="position: absolute; top: -12px; left: 20px; background: #FFC107; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; color: #000;">
                  ⚠️ QUAN TRỌNG
                </div>
                <ul style="color: #856404; margin: 15px 0 0 0; padding-left: 20px; line-height: 1.8;">
                  <li><strong>Thời hạn:</strong> Mã OTP có hiệu lực trong <strong style="color: #d63384;">10 phút</strong></li>
                  <li><strong>Bảo mật:</strong> Không chia sẻ mã này với bất kỳ ai</li>
                  <li><strong>Sử dụng:</strong> Nhập mã vào ứng dụng để xác thực tài khoản</li>
                </ul>
              </div>
              
              <!-- Hướng dẫn -->
              <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">📱 Hướng dẫn sử dụng:</h3>
                <ol style="color: #666; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>Quay lại ứng dụng Đặt Vé Phim</li>
                  <li>Nhập mã OTP <strong style="color: #FF9800;">${otp}</strong> vào ô xác thực</li>
                  <li>Nhấn "Xác nhận" để hoàn tất đăng ký</li>
                  <li>Bắt đầu đặt vé xem phim yêu thích! 🍿</li>
                </ol>
              </div>
              
            </div>
            
            <!-- Footer -->
            <div style="background: #333; color: #fff; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px;">
                Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email này.
              </p>
              <p style="margin: 0; font-size: 12px; opacity: 0.7;">
                © 2024 Ứng dụng Đặt Vé Phim. Tất cả quyền được bảo lưu.
              </p>
              <div style="margin-top: 15px;">
                <span style="font-size: 20px;">🎬 🍿 🎭 🎪</span>
              </div>
            </div>
            
          </div>
          
        </body>
        </html>
      `,
      text: `
🎬 ỨNG DỤNG ĐẶT VÉ PHIM

Chào mừng bạn!

Mã OTP của bạn là: ${otp}

⏰ Mã có hiệu lực trong 10 phút.
🔒 Vui lòng không chia sẻ mã này với ai.

Hướng dẫn:
1. Quay lại ứng dụng
2. Nhập mã OTP: ${otp}
3. Nhấn "Xác nhận"
4. Bắt đầu đặt vé! 🍿

Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email này.

© 2024 Ứng dụng Đặt Vé Phim
      `
    };

    // Gửi email thật
    console.log('📧 Đang gửi email thật qua Gmail...');
    const result = await transporter.sendMail(mailOptions);
    
    console.log('🎉 EMAIL ĐÃ GỬI THÀNH CÔNG!');
    console.log('📬 Message ID:', result.messageId);
    console.log('📱 Kiểm tra hộp thư email của bạn ngay!');
    console.log('✉️  Email gửi từ:', EMAIL_USER);
    console.log('📧 Email gửi đến:', email);
    
    return { 
      success: true, 
      messageId: result.messageId,
      provider: 'gmail',
      note: 'Real email sent successfully'
    };
    
  } catch (error) {
    console.error('❌ LỖI GỬI EMAIL:', error.message);
    
    // Xử lý lỗi cụ thể
    if (error.code === 'EAUTH') {
      console.error('\n🔐 LỖI XÁC THỰC GMAIL:');
      console.error('App Password vẫn không hợp lệ!');
      console.error('App Password hiện tại:', EMAIL_PASS?.substring(0, 4) + '****');
      console.error('\n📋 GIẢI PHÁP:');
      console.error('1. Vào Gmail → Security → App passwords');
      console.error('2. Xóa app password cũ');
      console.error('3. Tạo app password mới');
      console.error('4. Cập nhật .env và restart server\n');
    } else if (error.code === 'ENOTFOUND') {
      console.error('❌ Không thể kết nối Gmail (kiểm tra internet)');
    } else {
      console.error('❌ Lỗi khác:', error.code);
    }
    
    // Fallback sang mock cho development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n🔧 FALLBACK: Dùng mock service cho development');
      return await guiOTPMock(email, otp, error.message);
    }
    
    return { 
      success: false, 
      error: error.message,
      code: error.code
    };
  }
};

// Mock backup function
const guiOTPMock = async (email, otp, loi) => {
  console.log('\n📧 === MOCK EMAIL SERVICE (FALLBACK) ===');
  console.log('Lý do mock:', loi);
  console.log('Gửi đến:', email);
  console.log('OTP:', otp);
  console.log('✅ Mock email "đã gửi" (Gmail failed)');
  
  return { 
    success: true, 
    messageId: 'mock-fallback-' + Date.now(),
    mock: true,
    testOTP: otp,
    warning: 'Gmail failed - using mock'
  };
};

const sendResetPasswordEmail = async (email, resetToken) => {
  try {
    console.log('=== ĐANG GỬI EMAIL RESET MẬT KHẨU ===');
    
    if (!EMAIL_USER || !EMAIL_PASS) {
      throw new Error('Thiếu config email');
    }
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });
    
    await transporter.verify();
    
    const result = await transporter.sendMail({
      from: `"🎬 Ứng dụng Đặt Vé Phim" <${EMAIL_USER}>`,
      to: email,
      subject: '🔐 Đặt lại mật khẩu - Đặt vé phim',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #FFC107 0%, #FF9800 100%); padding: 30px; text-align: center; border-radius: 10px;">
            <h1 style="color: #000; margin: 0;">🎬 Đặt Vé Phim</h1>
            <h2 style="color: #333; margin: 10px 0 0 0;">Đặt lại mật khẩu</h2>
          </div>
          <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px;">
            <p>Mã đặt lại mật khẩu của bạn:</p>
            <div style="background: #000; color: #FFC107; padding: 25px; text-align: center; font-size: 36px; font-weight: bold; border-radius: 15px; letter-spacing: 5px;">
              ${resetToken}
            </div>
            <p style="margin-top: 20px;">⏰ Mã có hiệu lực trong <strong>15 phút</strong>.</p>
            <p>🔒 Không chia sẻ mã này với bất kỳ ai.</p>
          </div>
        </div>
      `,
      text: `Mã đặt lại mật khẩu: ${resetToken}. Có hiệu lực 15 phút. Không chia sẻ với ai.`
    });
    
    console.log('✅ Reset email đã gửi thành công:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Lỗi gửi reset email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendResetPasswordEmail
};