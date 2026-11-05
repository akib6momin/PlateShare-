const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { getDb } = require('./db');
const { initCronJobs } = require('./cron');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'PlateShare Food Donation Platform API',
    version: '1.0.0'
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/impact', require('./routes/impact'));
app.use('/api/notifications', require('./routes/notifications'));

// Serve frontend static build if available
const clientDistPath = path.join(__dirname, '../client/dist');
const fs = require('fs');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Boot Database and Schedulers
async function startServer() {
  try {
    console.log('🚀 Initializing PlateShare server...');
    const db = await getDb();
    console.log('✅ SQLite Database connected and schemas validated.');

    // Initialize background cron jobs
    initCronJobs();

    app.listen(PORT, () => {
      console.log(`🌐 PlateShare Backend API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
