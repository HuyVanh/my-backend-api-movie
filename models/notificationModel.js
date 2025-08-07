const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // ✅ Enhanced: More descriptive field names
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // ✅ Enhanced: More specific notification types
  type: {
    type: String,
    enum: [
      'ticket_booked',        // Đặt vé thành công
      'payment_success',      // Thanh toán thành công
      'payment_failed',       // Thanh toán thất bại
      'ticket_cancelled',     // Hủy vé
      'showtime_reminder',    // Nhắc nhở suất chiếu
      'promotion',            // Khuyến mại
      'system',               // Thông báo hệ thống
      'refund_processed',     // Hoàn tiền
      'ticket_expired'        // Vé hết hạn
    ],
    required: true
  },
  
  // ✅ Enhanced: Multiple reference types
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },
  
  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie'
  },
  
  // ✅ NEW: Payment reference for Stripe notifications
  paymentId: {
    type: String, // Stripe Payment Intent ID
    sparse: true
  },
  
  // ✅ Enhanced: Priority levels
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // ✅ Enhanced: Read status with timestamp
  isRead: {
    type: Boolean,
    default: false
  },
  
  readAt: {
    type: Date
  },
  
  // ✅ NEW: Action button data
  actionData: {
    type: {
      type: String,
      enum: ['navigate', 'external_link', 'none'],
      default: 'none'
    },
    target: String, // Screen name or URL
    params: mongoose.Schema.Types.Mixed // Navigation params
  },
  
  // ✅ NEW: Metadata for different notification types
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // ✅ Enhanced: Expiry for temporary notifications
  expiresAt: {
    type: Date
  },
  
  // ✅ Enhanced: Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // ✅ Legacy field for backward compatibility
  date: {
    type: Date,
    default: Date.now
  },
  
  name: {
    type: String // Keep for backward compatibility
  },
  
  status: {
    type: Boolean,
    default: false // Keep for backward compatibility
  }
}, {
  timestamps: true // Automatically manage createdAt and updatedAt
});

// ✅ Indexes for performance
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ priority: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

// ✅ Pre-save middleware
NotificationSchema.pre('save', function(next) {
  // Update readAt timestamp when marking as read
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  
  // Sync legacy fields
  if (this.title && !this.name) {
    this.name = this.title;
  }
  if (typeof this.isRead !== 'undefined' && this.status !== this.isRead) {
    this.status = this.isRead;
  }
  
  next();
});

// ✅ Static methods for creating specific notification types
NotificationSchema.statics.createTicketNotification = async function(userId, ticketId, type, additionalData = {}) {
  const notificationData = {
    user: userId,
    ticket: ticketId,
    type: type,
    ...additionalData
  };
  
  switch (type) {
    case 'ticket_booked':
      notificationData.title = 'Đặt vé thành công';
      notificationData.message = 'Vé của bạn đã được đặt thành công. Vui lòng thanh toán để hoàn tất.';
      notificationData.priority = 'high';
      notificationData.actionData = {
        type: 'navigate',
        target: 'MyTicket',
        params: { ticketId }
      };
      break;
      
    case 'payment_success':
      notificationData.title = 'Thanh toán thành công';
      notificationData.message = 'Thanh toán vé xem phim của bạn đã được xử lý thành công.';
      notificationData.priority = 'high';
      notificationData.actionData = {
        type: 'navigate',
        target: 'MyTicket',
        params: { ticketId }
      };
      break;
      
    case 'payment_failed':
      notificationData.title = 'Thanh toán thất bại';
      notificationData.message = 'Thanh toán vé xem phim của bạn đã thất bại. Vui lòng thử lại.';
      notificationData.priority = 'urgent';
      notificationData.actionData = {
        type: 'navigate',
        target: 'PaymentScreen',
        params: { ticketId }
      };
      break;
      
    case 'ticket_cancelled':
      notificationData.title = 'Vé đã được hủy';
      notificationData.message = 'Vé xem phim của bạn đã được hủy thành công.';
      notificationData.priority = 'medium';
      break;
      
    case 'showtime_reminder':
      notificationData.title = 'Nhắc nhở suất chiếu';
      notificationData.message = 'Suất chiếu của bạn sẽ bắt đầu trong 30 phút.';
      notificationData.priority = 'high';
      notificationData.actionData = {
        type: 'navigate',
        target: 'MyTicket',
        params: { ticketId }
      };
      break;
  }
  
  return await this.create(notificationData);
};

// ✅ Static method for payment notifications
NotificationSchema.statics.createPaymentNotification = async function(userId, paymentId, type, ticketId = null, additionalData = {}) {
  return await this.createTicketNotification(userId, ticketId, type, {
    paymentId,
    ...additionalData
  });
};

// ✅ Instance methods
NotificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.status = true; // Legacy compatibility
  this.readAt = new Date();
  return this.save();
};

NotificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.status = false; // Legacy compatibility
  this.readAt = null;
  return this.save();
};

module.exports = mongoose.model('Notification', NotificationSchema);