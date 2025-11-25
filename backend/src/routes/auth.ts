import express from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { email, password, fullName } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'User already exists' });
  
  const userCount = await User.countDocuments();
  const role = userCount === 0 ? 'admin' : 'accountant';
  
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

export default router;
