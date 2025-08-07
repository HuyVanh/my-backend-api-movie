// controllers/employeeController.js
const User = require('../models/userModel');

// =====================================
// AUTHENTICATION
// =====================================

// @desc    Đăng nhập nhân viên
// @route   POST /api/employees/login
// @access  Public
const loginEmployee = async (req, res) => {
  try {
    console.log('=== EMPLOYEE LOGIN ===');
    console.log('Request body:', req.body);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập email và mật khẩu'
      });
    }

    // Tìm user với role = 'employee'
    const user = await User.findOne({ 
      email, 
      role: 'employee' 
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Kiểm tra mật khẩu
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Kiểm tra trạng thái
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Kiểm tra work_status nếu có employee info
    if (user.employee && user.employee.work_status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Nhân viên không còn hoạt động'
      });
    }

    // Tạo token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          employee: user.employee
        }
      }
    });

  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng nhập'
    });
  }
};

// =====================================
// PROFILE MANAGEMENT
// =====================================

// @desc    Lấy thông tin profile nhân viên
// @route   GET /api/employees/profile
// @access  Private (Employee)
const getEmployeeProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thông tin nhân viên'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get employee profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thông tin profile'
    });
  }
};

// @desc    Cập nhật thông tin cá nhân nhân viên
// @route   PUT /api/employees/profile
// @access  Private (Employee)
const updateEmployeeProfile = async (req, res) => {
  try {
    const { name, number_phone, date_of_birth, gender } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (number_phone) updateData.number_phone = number_phone;
    if (date_of_birth) updateData.date_of_birth = date_of_birth;
    if (gender) updateData.gender = gender;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: user
    });

  } catch (error) {
    console.error('Update employee profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật thông tin'
    });
  }
};

// @desc    Đổi mật khẩu nhân viên
// @route   PUT /api/employees/change-password
// @access  Private (Employee)
const changeEmployeePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu hiện tại không chính xác'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });

  } catch (error) {
    console.error('Change employee password error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đổi mật khẩu'
    });
  }
};

// =====================================
// EMPLOYEE MANAGEMENT (Admin/Manager)
// =====================================

// @desc    Đăng ký nhân viên mới
// @route   POST /api/employees/register
// @access  Private (Admin/Manager)
const registerEmployee = async (req, res) => {
  try {
    console.log('=== REGISTER EMPLOYEE ===');
    console.log('Request by:', req.user.email);
    console.log('Request body:', req.body);

    const { 
      name, 
      email, 
      password, 
      number_phone, 
      date_of_birth, 
      gender,
      employee 
    } = req.body;

    // Validation
    if (!name || !email || !password || !number_phone) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
      });
    }

    if (!employee || !employee.position || !employee.department) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập thông tin chức vụ và phòng ban'
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

    // Tạo nhân viên mới
    const newEmployee = await User.create({
      name,
      email,
      password,
      number_phone,
      date_of_birth,
      gender,
      role: 'employee',
      employee: {
        position: employee.position,
        hire_date: employee.hire_date || new Date(),
        salary: employee.salary,
        department: employee.department,
        work_status: 'active'
      },
      email_verify: true
    });

    console.log('Employee created:', newEmployee.employee.employee_id);

    res.status(201).json({
      success: true,
      message: 'Tạo nhân viên thành công',
      data: {
        id: newEmployee._id,
        name: newEmployee.name,
        email: newEmployee.email,
        employee_id: newEmployee.employee.employee_id,
        position: newEmployee.employee.position,
        department: newEmployee.employee.department
      }
    });

  } catch (error) {
    console.error('Register employee error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Email hoặc số điện thoại đã được sử dụng'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Lỗi server khi tạo nhân viên'
    });
  }
};

// @desc    Lấy danh sách tất cả nhân viên
// @route   GET /api/employees
// @access  Private (Admin/Manager)
const getAllEmployees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { role: 'employee' };

    const employees = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: employees.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: employees
    });

  } catch (error) {
    console.error('Get all employees error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy danh sách nhân viên'
    });
  }
};

// @desc    Lấy thông tin nhân viên theo ID
// @route   GET /api/employees/:id
// @access  Private (Admin/Manager)
const getEmployeeById = async (req, res) => {
  try {
    const employee = await User.findOne({ 
      _id: req.params.id, 
      role: 'employee' 
    }).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy nhân viên'
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });

  } catch (error) {
    console.error('Get employee by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thông tin nhân viên'
    });
  }
};

// @desc    Cập nhật thông tin công việc nhân viên
// @route   PUT /api/employees/:id/work-info
// @access  Private (Admin/Manager)
const updateEmployeeWorkInfo = async (req, res) => {
  try {
    const { position, department, salary, work_status } = req.body;

    const updateData = {};
    if (position) updateData['employee.position'] = position;
    if (department) updateData['employee.department'] = department;
    if (salary) updateData['employee.salary'] = salary;
    if (work_status) updateData['employee.work_status'] = work_status;

    const employee = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'employee' },
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy nhân viên'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin công việc thành công',
      data: employee
    });

  } catch (error) {
    console.error('Update employee work info error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật thông tin công việc'
    });
  }
};

// @desc    Xóa nhân viên (soft delete)
// @route   DELETE /api/employees/:id
// @access  Private (Admin)
const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findOne({ 
      _id: req.params.id, 
      role: 'employee' 
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy nhân viên'
      });
    }

    // Soft delete
    await User.findByIdAndUpdate(req.params.id, { 
      status: 'deleted',
      'employee.work_status': 'inactive'
    });

    res.status(200).json({
      success: true,
      message: 'Xóa nhân viên thành công'
    });

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xóa nhân viên'
    });
  }
};

// @desc    Thống kê nhân viên
// @route   GET /api/employees/stats
// @access  Private (Admin/Manager)
const getEmployeeStats = async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments({ role: 'employee' });
    const activeEmployees = await User.countDocuments({ 
      role: 'employee', 
      'employee.work_status': 'active' 
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: totalEmployees - activeEmployees
      }
    });

  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thống kê nhân viên'
    });
  }
};

// =====================================
// EXPORTS
// =====================================

module.exports = {
  loginEmployee,
  getEmployeeProfile,
  updateEmployeeProfile,
  changeEmployeePassword,
  registerEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployeeWorkInfo,
  deleteEmployee,
  getEmployeeStats
};