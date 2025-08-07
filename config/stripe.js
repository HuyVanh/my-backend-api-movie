// backend/config/stripe.js
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

console.log('🔧 Stripe initialized with key:', process.env.STRIPE_SECRET_KEY ? '✅ Key found' : '❌ No key');

module.exports = stripe;