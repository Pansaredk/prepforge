const mongoose = require('mongoose');

/**
 * Connects to MongoDB database using MONGODB_URI environment variable.
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_interview_prep';

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database] MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
