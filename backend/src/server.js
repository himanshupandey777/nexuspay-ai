
import dns from 'node:dns';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

// Fix Node.js DNS resolution for MongoDB Atlas
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/', (req, res) => {
  res.json({
    message: '🚀 NexusPay AI Backend is running',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

// API health route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'connected',
    paypal: process.env.PAYPAL_MODE || 'not configured'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development'
      ? err.message
      : undefined
  });
});

// Start server only after MongoDB connects
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log('\n🎯 NexusPay AI Backend');
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health\n`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
