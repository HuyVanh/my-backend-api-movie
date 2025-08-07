const express = require('express');
const router = express.Router();

const {
  createPaymentIntent,
  confirmPayment,
  stripeWebhook,
  getPaymentIntent
} = require('../controllers/paymentController');

// @route   POST /api/payment/create-payment-intent
// @desc    Tạo Payment Intent
// @access  Public
router.post('/create-payment-intent', createPaymentIntent);

// @route   POST /api/payment/confirm-payment
// @desc    Xác nhận thanh toán
// @access  Public
router.post('/confirm-payment', confirmPayment);

// @route   GET /api/payment/payment-intent/:id
// @desc    Lấy thông tin Payment Intent
// @access  Public
router.get('/payment-intent/:id', getPaymentIntent);

// @route   POST /api/payment/webhook
// @desc    Stripe Webhook (raw body required)
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = router;