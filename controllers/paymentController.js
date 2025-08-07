const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Ticket = require('../models/ticketModel');

// @desc    Tạo Payment Intent cho Stripe
// @route   POST /api/payment/create-payment-intent
// @access  Public
exports.createPaymentIntent = async (req, res) => {
  try {
    console.log('📦 Payment Intent Request:', req.body);

    const { 
      amount, 
      currency = 'vnd', 
      orderId,
      movieTitle,
      ticketInfo,
      metadata = {} 
    } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Số tiền không hợp lệ'
      });
    }

    // Tạo Payment Intent với Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Stripe yêu cầu số nguyên (VND đã tính bằng đồng)
      currency: currency.toLowerCase(),
      metadata: {
        orderId: orderId || '',
        movieTitle: movieTitle || '',
        ticketCount: ticketInfo?.count?.toString() || '1',
        customerEmail: metadata.customerEmail || '',
        customerName: metadata.customerName || '',
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
      // Thêm description cho dễ theo dõi
      description: `Đặt vé xem phim: ${movieTitle || 'Movie Ticket'}`,
    });

    console.log('✅ Payment Intent created:', paymentIntent.id);

    res.status(200).json({
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });

  } catch (error) {
    console.error('❌ Payment Intent Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Không thể tạo payment intent',
      details: error.message
    });
  }
};

// @desc    Xác nhận thanh toán thành công
// @route   POST /api/payment/confirm-payment
// @access  Public
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'PaymentIntent ID là bắt buộc'
      });
    }

    // Lấy thông tin Payment Intent từ Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Thanh toán chưa hoàn thành',
        status: paymentIntent.status
      });
    }

    // Cập nhật ticket status nếu có orderId
    let ticket = null;
    if (orderId) {
      ticket = await Ticket.findOneAndUpdate(
        { orderId: orderId },
        { 
          status: 'completed',
          paymentMethod: 'stripe',
          confirmedAt: new Date(),
          stripePaymentIntentId: paymentIntentId // Lưu lại để theo dõi
        },
        { new: true }
      ).populate('movie', 'name image')
       .populate('cinema', 'name address')
       .populate('room', 'name')
       .populate('seats', 'name')
       .populate('time', 'time date');
    }

    console.log('✅ Payment confirmed for order:', orderId);

    res.status(200).json({
      success: true,
      message: 'Thanh toán thành công',
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      },
      ticket: ticket
    });

  } catch (error) {
    console.error('❌ Confirm Payment Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Lỗi xác nhận thanh toán',
      details: error.message
    });
  }
};

// @desc    Webhook từ Stripe (tự động xử lý events)
// @route   POST /api/payment/webhook
// @access  Public (with verification)
exports.stripeWebhook = (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // Bạn sẽ lấy từ Stripe Dashboard

  let event;

  try {
    if (endpointSecret) {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      // For development without webhook secret
      event = req.body;
    }
  } catch (err) {
    console.log(`⚠️ Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Xử lý các sự kiện từ Stripe
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('💰 PaymentIntent succeeded:', paymentIntent.id);
      
      // Tự động cập nhật ticket status
      handlePaymentSuccess(paymentIntent);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('❌ Payment failed:', failedPayment.id);
      
      // Tự động cập nhật ticket status
      handlePaymentFailure(failedPayment);
      break;

    case 'payment_intent.canceled':
      const canceledPayment = event.data.object;
      console.log('🚫 Payment canceled:', canceledPayment.id);
      break;

    default:
      console.log(`🔄 Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};

// Helper function: Xử lý thanh toán thành công
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.orderId;
    
    if (orderId) {
      await Ticket.findOneAndUpdate(
        { orderId: orderId },
        { 
          status: 'completed',
          paymentMethod: 'stripe',
          confirmedAt: new Date(),
          stripePaymentIntentId: paymentIntent.id
        }
      );
      console.log(`✅ Ticket ${orderId} marked as completed`);
    }
  } catch (error) {
    console.error('❌ Error updating ticket after payment success:', error.message);
  }
};

// Helper function: Xử lý thanh toán thất bại
const handlePaymentFailure = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.orderId;
    
    if (orderId) {
      // Có thể cập nhật status hoặc gửi email thông báo
      console.log(`⚠️ Payment failed for ticket ${orderId}`);
      
      // Tùy chọn: Tự động hủy vé sau một thời gian
      // await Ticket.findOneAndUpdate(
      //   { orderId: orderId },
      //   { status: 'cancelled', cancelReason: 'Payment failed' }
      // );
    }
  } catch (error) {
    console.error('❌ Error handling payment failure:', error.message);
  }
};

// @desc    Lấy thông tin thanh toán
// @route   GET /api/payment/payment-intent/:id
// @access  Public
exports.getPaymentIntent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const paymentIntent = await stripe.paymentIntents.retrieve(id);
    
    res.status(200).json({
      success: true,
      data: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      }
    });
    
  } catch (error) {
    console.error('❌ Get Payment Intent Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Không thể lấy thông tin thanh toán'
    });
  }
};