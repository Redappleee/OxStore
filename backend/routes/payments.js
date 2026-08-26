const router = require('express').Router();
const Stripe = require('stripe');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_missing');

router.post('/intent', protect, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid or missing order ID' });
    }
    const order = await Order.findById(orderId);
    if (!order || !order.user.equals(req.user.id)) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'Order already paid' });

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(order.amount * 100),
      currency: order.currency || 'inr',
      metadata: { orderId: order.id }
    });
    order.paymentProvider = 'stripe';
    order.paymentIntentId = intent.id;
    await order.save();
    res.json({ clientSecret: intent.client_secret });
  } catch (e) {
    console.error('Stripe intent error:', e);
    res.status(500).json({ message: e.message || 'Stripe intent creation failed' });
  }
});

router.post('/razorpay/order', protect, async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ message: 'Razorpay is not configured' });
    }
    const { orderId } = req.body;
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid or missing order ID' });
    }
    const order = await Order.findById(orderId);
    if (!order || !order.user.equals(req.user.id)) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'Order already paid' });

    const amountInPaise = Math.round(order.amount * 100);
    if (amountInPaise < 100) return res.status(400).json({ message: 'Minimum order amount is 100 paise (₹1)' });

    order.currency = 'inr';
    await order.save();

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const gatewayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `ox_${order.id.slice(-20)}`,
      notes: { oxstoreOrderId: order.id }
    });

    order.paymentProvider = 'razorpay';
    order.razorpayOrderId = gatewayOrder.id;
    await order.save();

    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      gatewayOrder: { id: gatewayOrder.id, amount: gatewayOrder.amount, currency: gatewayOrder.currency },
      orderId: order.id
    });
  } catch (e) {
    console.error('Razorpay order error:', e);
    const errorMsg = e.error?.description || e.description || e.message || 'Razorpay order creation failed';
    const status = e.statusCode || 500;
    res.status(status).json({ message: `Razorpay Error: ${errorMsg}` });
  }
});

router.post('/razorpay/verify', protect, async (req, res) => {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing required payment verification fields' });
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    const order = await Order.findById(orderId);
    if (!order || !order.user.equals(req.user.id) || order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: 'Invalid Razorpay order' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const valid =
      razorpay_signature &&
      expected.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));

    if (!valid) return res.status(400).json({ message: 'Payment signature verification failed' });

    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.razorpayPaymentId = razorpay_payment_id;
    order.timeline.push({ status: 'confirmed', note: 'Razorpay payment verified' });
    await order.save();

    res.json({ message: 'Payment verified', order });
  } catch (e) {
    console.error('Razorpay verify error:', e);
    res.status(500).json({ message: e.message || 'Razorpay payment verification failed' });
  }
});

const stripeWebhook = async (req, res) => {
  try {
    const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'payment_intent.succeeded') {
      const id = event.data.object.metadata.orderId;
      await Order.findByIdAndUpdate(id, { paymentStatus: 'paid', status: 'confirmed', $push: { timeline: { status: 'confirmed', note: 'Payment received' } } });
    }
    if (event.type === 'payment_intent.payment_failed') {
      await Order.findOneAndUpdate({ paymentIntentId: event.data.object.id }, { paymentStatus: 'failed' });
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Stripe webhook error:', e);
    res.status(400).send(`Webhook error: ${e.message}`);
  }
};

const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!signature || !secret) return res.status(400).json({ message: 'Invalid Razorpay webhook' });
    const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    if (expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      return res.status(400).json({ message: 'Invalid Razorpay webhook signature' });
    }
    const event = JSON.parse(req.body.toString('utf8'));
    if (['payment.captured', 'order.paid'].includes(event.event)) {
      const payment = event.payload.payment?.entity;
      const razorpayOrderId = payment?.order_id || event.payload.order?.entity?.id;
      if (razorpayOrderId) {
        await Order.findOneAndUpdate(
          { razorpayOrderId, paymentStatus: { $ne: 'paid' } },
          { paymentStatus: 'paid', status: 'confirmed', razorpayPaymentId: payment?.id, $push: { timeline: { status: 'confirmed', note: 'Razorpay webhook confirmed payment' } } }
        );
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Razorpay webhook error:', e);
    res.status(500).json({ message: e.message || 'Razorpay webhook failed' });
  }
};

module.exports = { router, webhook: stripeWebhook, razorpayWebhook };
