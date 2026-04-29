import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import gamesRouter from './routes/games.js';
import authRouter from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameforge';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/games', gamesRouter);
app.use('/api/auth', authRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Connect to MongoDB and start server
async function startServer() {
  console.log('\n🚀 GameForge Backend Starting...');
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const server = app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ CORS enabled for ${CORS_ORIGIN}`);
      console.log('Ready to accept requests...\n');
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`✗ Port ${PORT} is already in use`);
      } else {
        console.error('✗ Server error:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB or start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
