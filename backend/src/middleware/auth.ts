import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    const user = await User.findById(decoded.sub).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(role: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}
