const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'site_settings',
  },
  announcements: {
    type: [String],
    default: [
      'COMPLIMENTARY SHIPPING ON ORDERS OVER ₹2,500',
      'THE AUTUMN EDIT 2026 IS NOW LIVE',
      'USE CODE OXWELCOME10 FOR 10% OFF YOUR FIRST ORDER'
    ],
  },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
