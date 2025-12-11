import express from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { email, password, fullName } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'User already exists' });
  
  const userCount = await User.countDocuments();
  const role = userCount === 0 ? 'admin' : 'unmarked';
  
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed, fullName, role });
  
  const token = jwt.sign({ sub: String(user._id) }, config.JWT_SECRET, { expiresIn: config.JWT_EXP });
  const userData = { id: user._id, email: user.email, role: user.role };
  console.log('Signup - User data being returned:', userData);
  res.json({ access: token, user: userData });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  
  const token = jwt.sign({ sub: String(user._id) }, config.JWT_SECRET, { expiresIn: config.JWT_EXP });
  const userData = { id: user._id, email: user.email, role: user.role };
  console.log('Login - User data being returned:', userData);
  res.json({ access: token, user: userData });
});

router.post('/refresh', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    const user = await User.findById(decoded.sub);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    
    const newToken = jwt.sign({ sub: String(user._id) }, config.JWT_SECRET, { expiresIn: config.JWT_EXP });
    const userData = { id: user._id, email: user.email, role: user.role };
    console.log('Refresh - User data being returned:', userData);
    res.json({ access: newToken, user: userData });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/logout', async (req, res) => {
  res.json({ message: 'Logged out' });
});

// Forgot password - generate reset token
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      // Return success even if user not found (security)
      return res.json({ message: 'If an account exists, a reset email will be sent' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();
    
    res.json({ 
      message: 'Reset token generated',
      resetToken,
      email: user.email,
      fullName: user.fullName || 'User'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change password (authenticated user)
router.post('/change-password', async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET) as { sub: string };
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
