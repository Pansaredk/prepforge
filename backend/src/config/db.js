const mongoose = require('mongoose');

/**
 * Connects to MongoDB database using MONGODB_URI environment variable.
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.warn('[Database] MONGODB_URI is not defined. Skipping database connection.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database] MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
