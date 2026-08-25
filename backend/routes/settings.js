const router = require('express').Router();
const Settings = require('../models/Settings');
const { protect, admin } = require('../middleware/auth');

// Get announcements (Public)
router.get('/announcements', async (req, res) => {
  let settings = await Settings.findOne({ key: 'site_settings' });
  if (!settings) {
    settings = await Settings.create({ key: 'site_settings' });
  }
  res.json({ announcements: settings.announcements || [] });
});

// Update announcements (Admin)
router.put('/announcements', protect, admin, async (req, res) => {
  const { announcements } = req.body;
  if (!Array.isArray(announcements)) {
    return res.status(400).json({ message: 'Announcements must be an array of text messages.' });
  }

  const clean = announcements.map(s => String(s).trim()).filter(Boolean);

  let settings = await Settings.findOneAndUpdate(
    { key: 'site_settings' },
    { announcements: clean },
    { new: true, upsert: true }
  );

  res.json({ announcements: settings.announcements, message: 'Announcement ticker updated successfully.' });
});

module.exports = router;
