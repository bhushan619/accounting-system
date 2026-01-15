import express from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';
import { signupSchema, loginSchema, resetPasswordSchema, changePasswordSchema, passwordSchema } from '../validation/auth';

const router = express.Router();

router.post('/signup', async (req, res) => {
  // Validate input
  const validation = signupSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors[0].message });
  }
  
  const { email, password, fullName } = validation.data;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'User already exists' });
  
  const userCount = await User.countDocuments();
  const role = userCount === 0 ? 'admin' : 'unmarked';
  
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed, fullName, role });
  
  const token = jwt.sign({ sub: String(user._id) }, config.JWT_SECRET, { expiresIn: config.JWT_EXP });
  const userData = { id: user._id, email: user.email, role: user.role, fullName: user.fullName };
  console.log('Signup - User data being returned:', userData);
  res.json({ access: token, user: userData });
});

router.post('/login', async (req, res) => {
  // Validate input
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid email or password format' });
  }
  
  const { email, password } = validation.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  
  const token = jwt.sign({ sub: String(user._id) }, config.JWT_SECRET, { expiresIn: config.JWT_EXP });
  const userData = { id: user._id, email: user.email, role: user.role, fullName: user.fullName };
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
    const userData = { id: user._id, email: user.email, role: user.role, fullName: user.fullName };
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
// SECURITY: Token is stored in DB and sent via email only - never exposed in API response
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Always return the same message to prevent email enumeration
    const genericMessage = 'If an account exists with this email, a reset link will be sent';
    
    if (!email || typeof email !== 'string') {
      return res.json({ message: genericMessage });
    }
    
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      // Return success even if user not found (security - prevent email enumeration)
      return res.json({ message: genericMessage });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();
    
    // SECURITY FIX: Never return the token in the response
    // The token should only be sent via email
    // For now, we return success - email sending should be handled by a separate backend service
    res.json({ 
      message: genericMessage,
      // Note: In production, implement server-side email sending
      // The token should NEVER be returned in the API response
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    // Return generic message even on error to prevent information leakage
    res.json({ message: 'If an account exists with this email, a reset link will be sent' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    // Validate input
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }
    
    const { token, newPassword } = validation.data;
    
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
    
    // Validate input
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }
    
    const { currentPassword, newPassword } = validation.data;
    
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