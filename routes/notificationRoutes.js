const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers
const {
  getNotifications,
  getNotification,
  createNotification,
  updateNotification,
  deleteNotification,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  clearReadNotifications
} = require('../controllers/notificationController');

// ✅ Tất cả routes yêu cầu xác thực
router.use(protect);

// ✅ Routes chính
router.route('/')
  .get(getNotifications)
  .post(createNotification);

// ✅ NEW: Batch operations
router.route('/mark-all-read').put(markAllAsRead);
router.route('/unread-count').get(getUnreadCount);
router.route('/clear-read').delete(clearReadNotifications);

// ✅ Individual notification routes
router.route('/:id')
  .get(getNotification)
  .put(updateNotification)
  .delete(deleteNotification);

router.route('/:id/read').put(markAsRead);

module.exports = router;