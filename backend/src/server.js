
import dns from 'node:dns';
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import connectDB from './config/db.js';
import githubRoutes from './routes/github.js';
import paymentRoutes from './routes/payments.js';
import milestoneRoutes from './routes/milestone.js';

// Fix Node.js DNS resolution for MongoDB Atlas
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
]
  .filter(Boolean)
  .map((url) => new URL(url).origin);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header (e.g. server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error(`❌ CORS blocked origin: ${origin}`);
    console.error('Allowed origins:', allowedOrigins);

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🚀 NexusPay AI Backend is running',
    status: 'success',
    timestamp: new Date().toISOString(),
  });
});

// API health check
app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'healthy' : 'unhealthy',
    database: dbConnected ? 'connected' : 'disconnected',
    paypal: process.env.PAYPAL_MODE || 'not configured',
    groq: process.env.GROQ_API_KEY ? 'configured' : 'not configured',
  });
});

// Register API routes
app.use('/api/github', githubRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/milestones', milestoneRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development'
      ? err.message
      : undefined,
  });
});

// Start server only after MongoDB connects
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log('\n🎯 NexusPay AI Backend');
      console.log('✅ MongoDB connected');
      console.log(`🤖 Groq API: ${process.env.GROQ_API_KEY ? 'Configured' : 'Missing'}`);
      console.log(`💳 PayPal Mode: ${process.env.PAYPAL_MODE || 'Not configured'}`);
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health\n`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
