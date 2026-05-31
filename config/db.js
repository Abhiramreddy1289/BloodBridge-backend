const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

const connectDB = async (uri) => {
  if (!uri) {
    throw new Error('MONGO_URI environment variable is required');
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;

