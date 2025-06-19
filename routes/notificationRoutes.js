const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Import controllers (chúng ta sẽ tạo sau)
const {
  getNotifications,
  getNotification,
  createNotification,
  updateNotification,
  deleteNotification,
  markAsRead
} = require('../controllers/notificationController');

// Tất cả routes bảo vệ bởi middleware xác thực
router.use(protect);

router.route('/')
  .get(getNotifications)
  .post(createNotification);

router.route('/:id')
  .get(getNotification)
  .put(updateNotification)
  .delete(deleteNotification);

router.route('/:id/read').put(markAsRead);

module.exports = router;