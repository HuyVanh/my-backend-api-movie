const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
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

  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Movie",
    required: true,
  },

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
  showtime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ShowTime"
  },

  time: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ShowTime", 
    required: true,
  },
   selectedSeats: [{
    seatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat"
    },
    name: String,
    price: Number
  }],
  showdate: {
    type: String,
    required: true,
  },
  seats: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      required: true,
    },
  ],
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
  discount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Discount",
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "stripe"],
    required: true,
  },

  status: {
    type: String,
    enum: ["pending_payment", "completed", "cancelled", "used"],
    default: "pending_payment",
  },
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

  // ✅ CÁC FIELD MỚI ĐỂ TRACK NHÂN VIÊN QUÉT VÉ
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true // Để query nhanh hơn
  },
  scannedByName: {
    type: String,
    default: null
  },
  employeeId: { 
    // Backup field cho compatibility
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    default: null,
    index: true
  },

  date: {
    type: Date,
    default: Date.now,
  },

  auth: {
    type: String,
  },
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

TicketSchema.pre("save", function (next) {
  if (!this.orderId) {
    this.orderId = `TK${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

// Existing indexes
TicketSchema.index({ showtime: 1, status: 1 });
TicketSchema.index({ time: 1, status: 1 });
TicketSchema.index({ room: 1, showtime: 1 });
TicketSchema.index({ seats: 1, showtime: 1 });

// ✅ NEW INDEXES cho scan history queries
TicketSchema.index({ scannedBy: 1, usedAt: -1 }); // Query scan history by employee
TicketSchema.index({ employeeId: 1, usedAt: -1 }); // Backup index
TicketSchema.index({ status: 1, scannedBy: 1 });   // Combined status + employee query

module.exports = mongoose.model("Ticket", TicketSchema);