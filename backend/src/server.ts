import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import gamesRouter from './routes/games.js';
import authRouter from './routes/auth.js';
import transactionsRouter from './routes/transactions.js';
import adminRouter from './routes/admin.js';
import { User } from './models/User.js';

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
app.use('/api/transactions', transactionsRouter);
app.use('/api/admin', adminRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

async function seedAdmins() {
  try {
    const adminPasswords = await bcryptjs.hash('12345678', 10);
    const adminsToSeed = [
      { email: 'hamza@gameforge.com', username: 'hamza' },
      { email: 'shaheer@gameforge.com', username: 'shaheer' }
    ];

    for (const adminData of adminsToSeed) {
      const exists = await User.findOne({ username: adminData.username });
      if (!exists) {
        await User.create({
          ...adminData,
          password: adminPasswords, // The model hook hashes it, but if we supply pre-hashed, the hook might hash it again? Wait, the hook hashes if modified. I'll just supply '12345678' and let the hook do it.
        });
      }
    }
  } catch (error) {
    console.error('Error seeding admins:', error);
  }
}

// Connect to MongoDB and start server
async function startServer() {
  console.log('\n🚀 GameForge Backend Starting...');
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Ensure admin accounts exist with correct role and password
    try {
      const adminsToSeed = [
        { email: 'hamza@gameforge.com', username: 'hamza' },
        { email: 'shaheer@gameforge.com', username: 'shaheer' }
      ];

      for (const adminData of adminsToSeed) {
        const existing = await User.findOne({ username: adminData.username });
        if (!existing) {
          // Create fresh admin
          const newAdmin = new User({
            ...adminData,
            password: '12345678',
            role: 'admin',
          });
          await newAdmin.save();
          console.log(`✓ Created admin account: ${adminData.username}`);
        } else if (existing.role !== 'admin') {
          // Upgrade existing user to admin and reset password
          existing.role = 'admin';
          existing.password = '12345678'; // pre-save hook will hash it
          await existing.save();
          console.log(`✓ Upgraded ${adminData.username} to admin`);
        } else {
          console.log(`✓ Admin account already correct: ${adminData.username}`);
        }
      }
    } catch (seedErr) {
      console.error('✗ Failed to seed admins:', seedErr);
    }

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
