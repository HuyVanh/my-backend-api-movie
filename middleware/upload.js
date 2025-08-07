const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'movie-app/avatars', // Folder trên Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { 
        width: 400, 
        height: 400, 
        crop: 'fill',
        gravity: 'face', // Tự động crop theo khuôn mặt
        quality: 'auto:good'
      }
    ],
    public_id: (req, file) => {
      // Tạo tên file unique
      return `avatar_${req.user.id}_${Date.now()}`;
    }
  },
});

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Chỉ cho phép 1 file
  },
  fileFilter: (req, file, cb) => {
    console.log('File being uploaded:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Check if file is image
    if (file.mimetype.startsWith('image/')) {
      // Check specific image types
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Chỉ hỗ trợ định dạng JPG, PNG, WEBP'), false);
      }
    } else {
      cb(new Error('File phải là hình ảnh'), false);
    }
  }
});

// Error handling middleware cho multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer Error:', err);
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File quá lớn. Kích thước tối đa là 5MB'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Chỉ được upload 1 file'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Field name không hợp lệ. Sử dụng "image"'
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Lỗi upload file: ' + err.message
        });
    }
  }
  
  if (err) {
    console.error('Upload Error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Lỗi upload file'
    });
  }
  
  next();
};

// Export both upload and error handler
module.exports = {
  upload,
  handleUploadError,
  cloudinary
};