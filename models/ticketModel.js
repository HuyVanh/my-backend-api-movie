const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  discount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discount'
  },
  seat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  food: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food'
  },
  total: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  auth: {
    type: String
  },
  cinema: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cinema',
    required: true
  },
  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  total_food: {
    type: Number,
    default: 0
  },
  showdate: {
    type: String,
    required: true
  },
  time: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Time',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  }
});

module.exports = mongoose.model('Ticket', TicketSchema);