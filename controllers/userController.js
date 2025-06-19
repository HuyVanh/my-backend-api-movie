const User = require('../models/userModel');
const bcrypt = require('bcryptjs');

// =====================================
// USER PROFILE MANAGEMENT (Logged-in users)
// =====================================

// @desc    Lấy thông tin profile người dùng hiện tại
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    console.log('=== GET PROFILE START ===');
    console.log('User ID:', req.user.id);
    
    // req.user được set từ auth middleware
    const user = await User.findById(req.user.id).select('-password');

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
    console.error('Get profile error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thông tin profile'
    });
  }
};

// @desc    Cập nhật profile người dùng hiện tại
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    console.log('=== UPDATE PROFILE START ===');
    console.log('User ID:', req.user.id);
    console.log('Update data:', req.body);
    
    const { name, number_phone, date_of_birth, gender, image } = req.body;

    // Chuẩn bị data cần update
    const updateData = {};
    if (name) updateData.name = name;
    if (number_phone) updateData.number_phone = number_phone;
    if (date_of_birth) updateData.date_of_birth = date_of_birth;
    if (gender) updateData.gender = gender;
    if (image) updateData.image = image;

    // Kiểm tra số điện thoại unique nếu có thay đổi
    if (number_phone) {
      const phoneExists = await User.findOne({ 
        number_phone,
        _id: { $ne: req.user.id }
      });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          error: 'Số điện thoại đã được sử dụng'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Cập nhật profile thành công',
      data: user
    });
  } catch (err) {
    console.error('Update profile error:', err);
    
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Số điện thoại đã được sử dụng'
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
      error: 'Lỗi server khi cập nhật profile'
    });
  }
};

// @desc    Đổi mật khẩu
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    console.log('=== CHANGE PASSWORD START ===');
    console.log('User ID:', req.user.id);
    
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    // Lấy user với password field
    const user = await User.findById(req.user.id).select('+password');

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu hiện tại không chính xác'
      });
    }

    // Cập nhật mật khẩu mới (sẽ được hash bởi pre-save middleware)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đổi mật khẩu'
    });
  }
};

// @desc    Upload avatar
// @route   POST /api/users/upload-avatar
// @access  Private
exports.uploadAvatar = async (req, res) => {
  try {
    console.log('=== UPLOAD AVATAR START ===');
    console.log('User ID:', req.user.id);
    
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp URL hình ảnh'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { image: imageUrl },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Upload avatar thành công',
      data: user
    });
  } catch (err) {
    console.error('Upload avatar error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi upload avatar'
    });
  }
};

// =====================================
// ADMIN USER MANAGEMENT
// =====================================

// @desc    Lấy tất cả người dùng
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    console.log('=== GET USERS START ===');
    console.log('Admin user:', req.user.email);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.role) filters.role = req.query.role;
    if (req.query.email_verify) filters.email_verify = req.query.email_verify === 'true';
    if (req.query.search) {
      filters.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { number_phone: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(filters)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filters);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy danh sách người dùng'
    });
  }
};

// @desc    Lấy chi tiết người dùng
// @route   GET /api/users/:id
// @access  Private (Admin)
exports.getUser = async (req, res) => {
  try {
    console.log('=== GET USER START ===');
    console.log('User ID:', req.params.id);
    
    // Validate ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'ID người dùng không hợp lệ'
      });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thông tin người dùng'
    });
  }
};

// @desc    Tạo người dùng mới (Admin)
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = async (req, res) => {
  try {
    console.log('=== CREATE USER START ===');
    console.log('Admin user:', req.user.email);
    console.log('Request body:', req.body);
    
    const { name, email, password, number_phone, date_of_birth, gender, status, role } = req.body;

    // Validation
    if (!name || !email || !password || !number_phone) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
      });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email đã được sử dụng'
      });
    }

    // Kiểm tra số điện thoại đã tồn tại
    const existingPhone = await User.findOne({ number_phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        error: 'Số điện thoại đã được sử dụng'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      number_phone,
      date_of_birth,
      gender,
      status: status || 'active',
      role: role || 'user',
      email_verify: true // Admin tạo thì auto verify
    });

    // Loại bỏ password khỏi response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'Tạo người dùng thành công',
      data: userResponse
    });
  } catch (err) {
    console.error('Create user error:', err);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field === 'email' ? 'Email' : 'Số điện thoại'} đã được sử dụng`
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
      error: 'Lỗi server khi tạo người dùng'
    });
  }
};

// @desc    Cập nhật người dùng (Admin)
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
  try {
    console.log('=== UPDATE USER START ===');
    console.log('User ID:', req.params.id);
    console.log('Admin user:', req.user.email);
    console.log('Update data:', req.body);
    
    // Validate ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'ID người dùng không hợp lệ'
      });
    }

    const { password, ...updateData } = req.body;

    // Kiểm tra user có tồn tại không
    const existingUser = await User.findById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }

    // Kiểm tra email unique nếu có thay đổi
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await User.findOne({ 
        email: updateData.email,
        _id: { $ne: req.params.id }
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email đã được sử dụng'
        });
      }
    }

    // Kiểm tra số điện thoại unique nếu có thay đổi
    if (updateData.number_phone && updateData.number_phone !== existingUser.number_phone) {
      const phoneExists = await User.findOne({ 
        number_phone: updateData.number_phone,
        _id: { $ne: req.params.id }
      });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          error: 'Số điện thoại đã được sử dụng'
        });
      }
    }

    // Xử lý cập nhật mật khẩu riêng
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id, 
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Cập nhật người dùng thành công',
      data: user
    });
  } catch (err) {
    console.error('Update user error:', err);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field === 'email' ? 'Email' : 'Số điện thoại'} đã được sử dụng`
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
      error: 'Lỗi server khi cập nhật người dùng'
    });
  }
};

// @desc    Xóa người dùng (Admin)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    console.log('=== DELETE USER START ===');
    console.log('User ID:', req.params.id);
    console.log('Admin user:', req.user.email);
    
    // Validate ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'ID người dùng không hợp lệ'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }

    // Không cho phép admin xóa chính mình
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Không thể xóa tài khoản của chính mình'
      });
    }

    // Soft delete: chỉ cập nhật status thay vì xóa hoàn toàn
    await User.findByIdAndUpdate(req.params.id, { 
      status: 'deleted',
      email: `deleted_${Date.now()}_${user.email}`, // Tránh lỗi unique constraint
      number_phone: `deleted_${Date.now()}_${user.number_phone}`
    });

    // Nếu muốn xóa hoàn toàn, dùng dòng này thay thế:
    // await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Xóa người dùng thành công',
      data: {}
    });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xóa người dùng'
    });
  }
};

// @desc    Thống kê người dùng (Admin)
// @route   GET /api/users/stats
// @access  Private (Admin)
exports.getUserStats = async (req, res) => {
  try {
    console.log('=== GET USER STATS START ===');
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const verifiedUsers = await User.countDocuments({ email_verify: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    
    // Users đăng ký trong 30 ngày qua
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });

    // Thống kê theo tháng
    const monthlyStats = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $limit: 12
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          verifiedUsers,
          adminUsers,
          newUsers
        },
        monthlyStats
      }
    });
  } catch (err) {
    console.error('Get user stats error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thống kê người dùng'
    });
  }
};