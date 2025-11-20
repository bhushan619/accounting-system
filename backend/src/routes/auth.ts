import express from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';
const router = express.Router();
router.post('/signup', async (req,res)=> {
  const { email, password } = req.body;
  const existing = await User.findOne({ email });
  if(existing) return res.status(400).json({ error: 'exists' });
  const hashed = await bcrypt.hash(password, 10);
  const u = await User.create({ email, password: hashed });
  const token = jwt.sign({ sub: String(u._id) }, config.JWT_SECRET, { expiresIn: config.JWT_EXP });
  res.json({ access: token });
});
router.post('/login', async (req,res)=> {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if(!user) return res.status(401).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.password);
  if(!ok) return res.status(401).json({ error: 'invalid' });
  const token = jwt.sign({ sub: String(user._id) }, config.JWT_SECRET, { expiresIn: config.JWT_EXP });
  res.json({ access: token });
});
export default router;
