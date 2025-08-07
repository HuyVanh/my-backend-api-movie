const express = require('express');
const router = express.Router();

// Import controllers
const {
  // User profile routes
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  
  // Admin routes
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/userController');

// Import middleware
const { protect, authorize } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload'); // THÊM IMPORT NÀY

// =====================================
// USER PROFILE ROUTES (Logged-in users)
// =====================================

// @route   GET /api/users/profile
router.get('/profile', protect, getProfile);

// @route   PUT /api/users/profile
router.put('/profile', protect, updateProfile);

// @route   PUT /api/users/change-password
router.put('/change-password', protect, changePassword);

// @route   POST /api/users/upload-avatar
// THAY ĐỔI DÒNG NÀY - thêm middleware upload
router.post('/upload-avatar', protect, upload.single('image'), handleUploadError, uploadAvatar);

// =====================================
// ADMIN ROUTES
// =====================================

// @route   GET /api/users/stats
router.get('/stats', protect, authorize('admin'), getUserStats);

// @route   GET /api/users
router.get('/', protect, authorize('admin'), getUsers);

// @route   POST /api/users
router.post('/', protect, authorize('admin'), createUser);

// @route   GET /api/users/:id
router.get('/:id', protect, authorize('admin'), getUser);

// @route   PUT /api/users/:id
router.put('/:id', protect, authorize('admin'), updateUser);

// @route   DELETE /api/users/:id
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;