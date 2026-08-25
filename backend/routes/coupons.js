const router = require('express').Router();
const Coupon = require('../models/Coupon');
const { protect, adminOnly } = require('../middleware/auth');

// Get all coupons (Admin)
router.get('/', protect, adminOnly, async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt');
  res.json({ coupons });
});

// Create new coupon (Admin)
router.post('/', protect, adminOnly, async (req, res) => {
  const { code, discountType, discountValue, minOrderAmount, maxDiscount, expiresAt, usageLimit } = req.body;
  
  if (!code || discountValue === undefined) {
    return res.status(400).json({ message: 'Coupon code and discount value are required.' });
  }

  const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (existing) {
    return res.status(400).json({ message: 'A coupon with this code already exists.' });
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase().trim(),
    discountType: discountType || 'percentage',
    discountValue: Number(discountValue),
    minOrderAmount: Number(minOrderAmount || 0),
    maxDiscount: maxDiscount ? Number(maxDiscount) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    usageLimit: Number(usageLimit || 100),
  });

  res.status(201).json({ coupon, message: 'Coupon created successfully.' });
});

// Delete coupon (Admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
  res.json({ message: 'Coupon deleted successfully.' });
});

// Validate & apply coupon code (Public / User)
router.post('/apply', async (req, res) => {
  const { code, orderAmount = 0 } = req.body;
  if (!code) return res.status(400).json({ message: 'Please enter a coupon code.' });

  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });
  if (!coupon) return res.status(404).json({ message: 'Invalid or inactive coupon code.' });

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return res.status(400).json({ message: 'This coupon code has expired.' });
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({ message: 'This coupon has reached its usage limit.' });
  }

  if (orderAmount < coupon.minOrderAmount) {
    return res.status(400).json({ message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon.` });
  }

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = (orderAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }

  // Ensure discount does not exceed order amount
  discount = Math.min(discount, orderAmount);

  res.json({
    ok: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount: Math.round(discount),
    finalAmount: Math.max(0, Math.round(orderAmount - discount)),
    message: `Coupon '${coupon.code}' applied successfully!`
  });
});

module.exports = router;
