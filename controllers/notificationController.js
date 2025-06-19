const Notification = require('../models/notificationModel');

// @desc    Lấy tất cả thông báo của user hiện tại
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate('ticket', 'total showdate')
      .sort('-date');

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
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
      .populate('ticket', 'total showdate');

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thông báo'
      });
    }

    // Kiểm tra quyền truy cập (chỉ user sở hữu thông báo mới xem được)
    if (notification.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền truy cập thông báo này'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};

// @desc    Tạo thông báo mới
// @route   POST /api/notifications
// @access  Private
exports.createNotification = async (req, res) => {
  try {
    // Thêm user ID vào body
    req.body.user = req.user.id;

    const notification = await Notification.create(req.body);

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
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
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền cập nhật thông báo này'
      });
    }

    notification = await Notification.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
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
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền xóa thông báo này'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
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
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền truy cập thông báo này'
      });
    }

    notification.status = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
};