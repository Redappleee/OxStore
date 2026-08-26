const router = require('express').Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  res.json({ orders: await Order.find({ user: req.user.id }).sort('-createdAt') });
});

router.post('/', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    let validCartItems = (cart?.items || []).filter(i => i.product);

    if (!validCartItems.length && Array.isArray(req.body.items) && req.body.items.length > 0) {
      const rawItems = req.body.items;
      const pIds = rawItems
        .map(i => i.product?._id || i.product || i.id)
        .filter(id => id && mongoose.Types.ObjectId.isValid(id.toString()));

      if (pIds.length > 0) {
        const products = await Product.find({ _id: { $in: pIds } });
        const productMap = new Map(products.map(p => [p._id.toString(), p]));
        validCartItems = rawItems.map(i => {
          const rawId = i.product?._id || i.product || i.id;
          const pId = rawId ? rawId.toString() : null;
          const product = pId ? productMap.get(pId) : null;
          return product ? { product, quantity: i.quantity || 1, size: i.size, color: i.color } : null;
        }).filter(Boolean);
      }
    }

    if (!validCartItems.length) {
      return res.status(400).json({ message: 'Your cart is empty or contains unavailable items' });
    }

    const items = validCartItems.map(i => ({
      product: i.product._id,
      name: i.product.name,
      image: i.product.images?.[0]?.url || '',
      price: i.product.price,
      quantity: i.quantity,
      size: i.size,
      color: i.color
    }));

    for (const item of items) {
      const result = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
      if (!result.modifiedCount) {
        return res.status(409).json({ message: `${item.name} is no longer in stock` });
      }
    }

    const amount = items.reduce((n, i) => n + i.price * i.quantity, 0);
    const order = await Order.create({
      user: req.user.id,
      items,
      amount,
      currency: 'inr',
      shippingAddress: req.body.shippingAddress,
      timeline: [{ status: 'processing', note: 'Order created' }]
    });

    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(201).json({ order });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ message: err.message || 'Could not process order' });
  }
});

router.get('/:id', protect, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!order.user.equals(req.user.id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  res.json({ order });
});

module.exports = router;
