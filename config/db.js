const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Sửa từ MONGO_URI thành MONGODB_URI
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
