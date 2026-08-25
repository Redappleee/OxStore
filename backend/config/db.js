const mongoose = require('mongoose');

module.exports = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI environment variable is missing!');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }
};
