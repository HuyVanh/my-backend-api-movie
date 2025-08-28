// ✅ FIXED Payment Controller với better error handling
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Ticket = require('../models/ticketModel');

// @desc    Tạo Payment Intent cho Stripe
// @route   POST /api/payment/create-payment-intent
// @access  Public
exports.createPaymentIntent = async (req, res) => {
  try {
    console.log('📦 Payment Intent Request:', req.body);
    
    // ✅ ADD: Validate Stripe key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'Payment service not configured'
      });
    }

    const { 
      amount, 
      currency = 'vnd', 
      orderId,
      movieTitle,
      ticketInfo,
      metadata = {} 
    } = req.body;

    // ✅ IMPROVED: Better validation
    if (!amount || amount <= 0) {
      console.error('❌ Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        error: 'Số tiền không hợp lệ'
      });
    }

    // ✅ FIX: Ensure amount is integer for VND
    const stripeAmount = Math.round(Number(amount));
    console.log('💰 Processing amount:', { original: amount, stripe: stripeAmount });

    // ✅ ADD: Timeout handling
    const timeout = setTimeout(() => {
      console.error('❌ Payment Intent timeout');
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout'
        });
      }
    }, 25000); // 25 second timeout

    // Tạo Payment Intent với Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
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
      description: `Đặt vé xem phim: ${movieTitle || 'Movie Ticket'}`,
    });

    clearTimeout(timeout);

    console.log('✅ Payment Intent created:', paymentIntent.id);

    // ✅ FIX: Ensure response is sent only once
    if (!res.headersSent) {
      res.status(200).json({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      });
    }

  } catch (error) {
    console.error('❌ Payment Intent Error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack
    });
    
    // ✅ FIX: Better error responses
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Không thể tạo payment intent',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// ✅ ADD: Health check endpoint
exports.healthCheck = async (req, res) => {
  try {
    // Test Stripe connection
    await stripe.charges.list({ limit: 1 });
    
    res.json({
      success: true,
      stripe: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      stripe: 'error',
      error: error.message
    });
  }
};

// ✅ IMPROVED: Better confirm payment
exports.confirmPayment = async (req, res) => {
  try {
    console.log('🔍 Confirming payment:', req.body);
    
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'PaymentIntent ID là bắt buộc'
      });
    }

    // ✅ ADD: Timeout for Stripe API call
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Timeout khi xác nhận thanh toán'
        });
      }
    }, 20000);

    // Lấy thông tin Payment Intent từ Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    clearTimeout(timeout);

    console.log('💳 Payment Intent status:', paymentIntent.status);

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
      console.log('🎫 Updating ticket for order:', orderId);
      
      ticket = await Ticket.findOneAndUpdate(
        { orderId: orderId },
        { 
          status: 'completed',
          paymentMethod: 'stripe',
          confirmedAt: new Date(),
          stripePaymentIntentId: paymentIntentId
        },
        { new: true }
      ).populate('movie', 'name image')
       .populate('cinema', 'name address')
       .populate('room', 'name')
       .populate('seats', 'name')
       .populate('time', 'time date');

      if (!ticket) {
        console.warn('⚠️ Ticket not found for orderId:', orderId);
      } else {
        console.log('✅ Ticket updated successfully');
      }
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
    console.error('❌ Confirm Payment Error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      orderId: req.body.orderId
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Lỗi xác nhận thanh toán',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// ✅ IMPROVED: Enhanced webhook handling
exports.stripeWebhook = (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      console.warn('⚠️ Webhook secret not configured, skipping verification');
      event = req.body;
    }
  } catch (err) {
    console.log(`⚠️ Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('🔔 Webhook received:', event.type);

  // Xử lý các sự kiện từ Stripe
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('💰 PaymentIntent succeeded:', paymentIntent.id);
      handlePaymentSuccess(paymentIntent);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('❌ Payment failed:', failedPayment.id);
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

// ✅ IMPROVED: Better error handling in helper functions
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.orderId;
    
    if (orderId) {
      const ticket = await Ticket.findOneAndUpdate(
        { orderId: orderId },
        { 
          status: 'completed',
          paymentMethod: 'stripe',
          confirmedAt: new Date(),
          stripePaymentIntentId: paymentIntent.id
        },
        { new: true }
      );
      
      if (ticket) {
        console.log(`✅ Ticket ${orderId} marked as completed`);
      } else {
        console.warn(`⚠️ Ticket ${orderId} not found`);
      }
    }
  } catch (error) {
    console.error('❌ Error updating ticket after payment success:', error.message);
  }
};

const handlePaymentFailure = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.orderId;
    
    if (orderId) {
      console.log(`⚠️ Payment failed for ticket ${orderId}`);
      // Log for manual review
    }
  } catch (error) {
    console.error('❌ Error handling payment failure:', error.message);
  }
};

exports.getPaymentIntent = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📋 Getting payment intent:', id);
    
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