const Notification = require('../models/notificationModel');

// @desc    Lấy tất cả thông báo của user hiện tại
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // ✅ Enhanced: Support filtering
    const filter = { user: req.user.id };
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }
    
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const notifications = await Notification.find(filter)
      .populate('ticket', 'orderId total showdate status movie cinema room')
      .populate('movie', 'name image')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: notifications
    });
  } catch (err) {
    console.error('Get notifications error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thông báo'
    });
  }
};

// @desc    Lấy chi tiết thông báo
// @route   GET /api/notifications/:id
// @access  Private
exports.getNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('user', 'name email')
      .populate('ticket', 'orderId total showdate status movie cinema room')
      .populate('movie', 'name image duration');

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thông báo'
      });
    }

    // Kiểm tra quyền truy cập
    if (notification.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền truy cập thông báo này'
      });
    }

    // ✅ Auto-mark as read when viewing details
    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    console.error('Get notification error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy chi tiết thông báo'
    });
  }
};

// @desc    Tạo thông báo mới
// @route   POST /api/notifications
// @access  Private (Admin hoặc hệ thống)
exports.createNotification = async (req, res) => {
  try {
    // ✅ Enhanced: Support different creation methods
    const { userId, ticketId, type, paymentId, ...otherData } = req.body;
    
    let notification;
    
    if (type && ticketId) {
      // Create using static method for ticket notifications
      notification = await Notification.createTicketNotification(
        userId || req.user.id, 
        ticketId, 
        type, 
        { paymentId, ...otherData }
      );
    } else {
      // Create manually
      req.body.user = userId || req.user.id;
      notification = await Notification.create(req.body);
    }

    // ✅ Populate the created notification
    const populatedNotification = await Notification.findById(notification._id)
      .populate('ticket', 'orderId total showdate')
      .populate('movie', 'name image');

    res.status(201).json({
      success: true,
      data: populatedNotification
    });
  } catch (err) {
    console.error('Create notification error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi tạo thông báo',
      details: err.message
    });
  }
};

// @desc    Cập nhật thông báo
// @route   PUT /api/notifications/:id
// @access  Private
exports.updateNotification = async (req, res) => {
  try {
    let notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thông báo'
      });
    }

    // Kiểm tra quyền sở hữu
    if (notification.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền cập nhật thông báo này'
      });
    }

    notification = await Notification.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('ticket', 'orderId total showdate');

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    console.error('Update notification error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật thông báo'
    });
  }
};

// @desc    Xóa thông báo
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thông báo'
      });
    }

    // Kiểm tra quyền sở hữu
    if (notification.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền xóa thông báo này'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Thông báo đã được xóa thành công'
    });
  } catch (err) {
    console.error('Delete notification error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xóa thông báo'
    });
  }
};

// @desc    Đánh dấu thông báo đã đọc
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thông báo'
      });
    }

    // Kiểm tra quyền sở hữu
    if (notification.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền truy cập thông báo này'
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      data: notification,
      message: 'Thông báo đã được đánh dấu đã đọc'
    });
  } catch (err) {
    console.error('Mark as read error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đánh dấu thông báo'
    });
  }
};

// ✅ NEW: Đánh dấu tất cả thông báo đã đọc
// @route   PUT /api/notifications/mark-all-read
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { 
        isRead: true, 
        status: true, // Legacy compatibility
        readAt: new Date() 
      }
    );

    res.status(200).json({
      success: true,
      message: `Đã đánh dấu ${result.modifiedCount} thông báo đã đọc`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Mark all as read error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đánh dấu tất cả thông báo'
    });
  }
};

// ✅ NEW: Lấy số lượng thông báo chưa đọc
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (err) {
    console.error('Get unread count error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy số thông báo chưa đọc'
    });
  }
};

// ✅ NEW: Xóa tất cả thông báo đã đọc
// @route   DELETE /api/notifications/clear-read
// @access  Private
exports.clearReadNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user.id,
      isRead: true
    });

    res.status(200).json({
      success: true,
      message: `Đã xóa ${result.deletedCount} thông báo đã đọc`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Clear read notifications error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xóa thông báo đã đọc'
    });
  }
};

// ✅ NEW: Helper function to create notification from payment events
exports.createPaymentNotification = async (userId, paymentData, type) => {
  try {
    return await Notification.createPaymentNotification(
      userId,
      paymentData.paymentId,
      type,
      paymentData.ticketId,
      {
        metadata: {
          amount: paymentData.amount,
          currency: paymentData.currency,
          paymentMethod: 'stripe'
        }
      }
    );
  } catch (error) {
    console.error('Create payment notification error:', error);
    throw error;
  }
};