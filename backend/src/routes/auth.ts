import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';
import { addNotificationStream, removeNotificationStream } from '../notifications.js';

const router = express.Router();

function generateToken(userId: string, email: string, role: string) {
  return jwt.sign({ id: userId, email, role }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '7d',
  });
}

// Register user
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, role } = req.body;
    console.log(`👤 New registration attempt - email: ${email}, username: ${username}, role: ${role || 'buyer'}`);

    if (!email || !username || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      console.log(`✗ User already exists: ${email}`);
      return res.status(400).json({ message: 'Email or username already exists' });
    }

    const user = new User({
      email,
      username,
      password,
      role: role || 'buyer',
    });

    await user.save();
    console.log(`✓ User registered successfully: ${email}`);

    const token = generateToken(user._id as unknown as string, user.email, user.role);
    const userResponse = user.toObject();
    delete (userResponse as any).password;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('✗ Error registering user:', error);
    res.status(500).json({ message: 'Error registering user', error });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔐 Login attempt - email: ${email}`);

    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      console.log(`✗ Login failed - user not found: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await (user as any).comparePassword(password);

    if (!isPasswordValid) {
      console.log(`✗ Login failed - invalid password: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log(`✓ Login successful: ${email}`);
    const token = generateToken(user._id as unknown as string, user.email, user.role);
    const userResponse = user.toObject();
    delete (userResponse as any).password;

    res.json({
      message: 'Login successful',
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('✗ Error logging in:', error);
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// Admin login
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`🔐 Admin login attempt - username: ${username}`);

    if (!username || !password) {
      return res.status(400).json({ message: 'Missing username or password' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      console.log(`✗ Admin login failed - user not found: ${username}`);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (user.role !== 'admin') {
      console.log(`✗ Admin login failed - not an admin: ${username}`);
      return res.status(403).json({ message: 'Forbidden: You are not an admin' });
    }

    const isPasswordValid = await (user as any).comparePassword(password);

    if (!isPasswordValid) {
      console.log(`✗ Admin login failed - invalid password: ${username}`);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    console.log(`✓ Admin login successful: ${username}`);
    const token = generateToken(user._id as unknown as string, user.email, user.role);
    const userResponse = user.toObject();
    delete (userResponse as any).password;

    res.json({
      message: 'Admin login successful',
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('✗ Error in admin login:', error);
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// Get current user (requires token)
router.get('/me', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.user.id).select('-password').populate('purchases').populate('listings');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error });
  }
});

router.get('/me/notifications/stream', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token || typeof token !== 'string') {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write('event: ready\ndata: {}\n\n');

    addNotificationStream(decoded.id, res);

    req.on('close', () => {
      removeNotificationStream(decoded.id, res);
      res.end();
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

router.patch('/me/notifications', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'enabled must be a boolean' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { notificationsEnabled: enabled },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification settings', error });
  }
});

router.patch('/me/notifications/:notificationId/read', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const notification = (user.notifications as any[]).find((item) => item._id.toString() === req.params.notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('purchases')
      .populate('listings');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error });
  }
});

// Update user profile (requires token)
router.patch('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user || req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Can only update your own profile' });
    }

    const { username, bio, avatar, socialLinks, role, notificationsEnabled } = req.body;
    const updateData: any = {};

    if (username !== undefined) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (role !== undefined) updateData.role = role;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      select: '-password',
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error });
  }
});

// Change password
router.post('/change-password', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Missing current or new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await (user as any).comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password', error });
  }
});

export default router;
