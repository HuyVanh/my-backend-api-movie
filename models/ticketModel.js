const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  // ✅ Order tracking - REMOVED duplicate index
  orderId: {
    type: String,
    unique: true,
    required: true,
  },

  // ✅ User reference (optional for guest bookings)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  // ✅ User info for guest bookings
  userInfo: {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
  },

  // ✅ Movie info
  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Movie",
    required: true,
  },

  // ✅ Cinema & Room info
  cinema: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cinema",
    required: true,
  },

  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },

  time: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ShowTime", 
    required: true,
  },

  showdate: {
    type: String,
    required: true,
  },

  // ✅ Multiple seats support
  seats: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      required: true,
    },
  ],

  // ✅ Multiple food items support
  foodItems: [
    {
      food: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Food",
      },
      quantity: {
        type: Number,
        default: 1,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],

  // ✅ Discount support
  discount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Discount",
  },

  // ✅ Payment info
  paymentMethod: {
    type: String,
    enum: ["cash", "stripe"],
    required: true,
  },

  status: {
    type: String,
    enum: ["pending_payment", "completed", "cancelled", "used"], // ✅ Thêm 'used'
    default: "pending_payment",
  },

  // ✅ Pricing breakdown
  seatTotalPrice: {
    type: Number,
    required: true,
  },
  cancelledAt: {
    type: Date,
  },

  cancelReason: {
    type: String,
  },

  foodTotalPrice: {
    type: Number,
    default: 0,
  },

  discountAmount: {
    type: Number,
    default: 0,
  },

  total: {
    type: Number,
    required: true,
  },

  // ✅ Timestamps
  bookingTime: {
    type: Date,
    default: Date.now,
  },

  confirmedAt: {
    type: Date,
  },
  usedAt: {
  type: Date,
},

  // ✅ Legacy fields (keep for compatibility)
  date: {
    type: Date,
    default: Date.now,
  },

  auth: {
    type: String,
  },

  // ✅ Deprecated single fields (keep for backward compatibility)
  seat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Seat",
  },

  food: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Food",
  },

  total_food: {
    type: Number,
    default: 0,
  },
});

// ✅ Generate orderId before saving
TicketSchema.pre("save", function (next) {
  if (!this.orderId) {
    this.orderId = `TK${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});
TicketSchema.index({ user: 1 });
TicketSchema.index({ "userInfo.email": 1 });
TicketSchema.index({ status: 1 });
TicketSchema.index({ bookingTime: -1 });

module.exports = mongoose.model("Ticket", TicketSchema);
