const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/config");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Vui lòng nhập họ tên"],
  },
  email: {
    type: String,
    required: [true, "Vui lòng nhập email"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Vui lòng nhập email hợp lệ",
    ],
  },
  password: {
    type: String,
    required: [true, "Vui lòng nhập mật khẩu"],
    minlength: 6,
    select: false,
  },
  date_of_birth: {
    type: String,
  },
  number_phone: {
    type: String,
    required: [true, "Vui lòng nhập số điện thoại"],
    unique: true,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
  },
  image: {
    type: String,
  },
  cloudinary_public_id: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "deleted"],
    default: "active",
  },
  
  role: {
    type: String,
    enum: ["user", "admin", "employee"],
    default: "user",
  },
  
  employee: {
    // ID nhân viên (tự động tạo)
    employee_id: {
      type: String,
      unique: true,
      sparse: true,
    },
    
    // Vị trí công việc
    position: {
      type: String,
      enum: [
        "cashier",     // Nhân viên bán vé
        "manager",     // Quản lý
        "supervisor",  // Giám sát
        "staff"        // Nhân viên
      ],
    },
    
    // Ngày vào làm
    hire_date: {
      type: Date,
    },
    
    // Lương
    salary: {
      type: Number,
    },
    
    // Phòng ban
    department: {
      type: String,
      enum: [
        "sales",       // Bán hàng
        "operations",  // Vận hành
        "management"   // Quản lý
      ],
    },
    
    // Trạng thái làm việc
    work_status: {
      type: String,
      enum: ["active", "inactive", "on_leave"],
      default: "active",
    }
  },
  // ========================================================
  
  email_verify: {
    type: Boolean,
    default: false,
  },
  emailOTP: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


UserSchema.methods.isEmployee = function() {
  return this.role === 'employee' && this.employee && this.employee.employee_id;
};


UserSchema.methods.generateEmployeeId = function() {
  // Tạo prefix từ position (3 ký tự đầu viết hoa)
  const prefix = this.employee?.position ? 
    this.employee.position.toUpperCase().substring(0, 3) : 'EMP';
  
  // Lấy 6 số cuối của timestamp
  const timestamp = Date.now().toString().slice(-6);
  
  return `${prefix}${timestamp}`;
};

UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.cloudinary_public_id;
  
  // Nếu không phải nhân viên thì ẩn thông tin employee
  if (this.role !== 'employee') {
    delete user.employee;
  }
  
  return user;
};

UserSchema.pre("save", async function (next) {
  // Tự động tạo employee_id nếu là nhân viên mới
  if (this.role === 'employee' && 
      this.employee && 
      !this.employee.employee_id && 
      this.isNew) {
    this.employee.employee_id = this.generateEmployeeId();
  }

  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Ký JWT và trả về (KHÔNG THAY ĐỔI)
UserSchema.methods.getSignedJwtToken = function () {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign({ id: this._id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN || "30d",
  });
};

// So sánh mật khẩu (KHÔNG THAY ĐỔI)
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);