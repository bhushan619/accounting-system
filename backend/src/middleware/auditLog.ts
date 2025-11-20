import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import AuditLog from '../models/AuditLog';

export function auditLog(action: string, entity: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        await AuditLog.create({
          user: req.user._id,
          action,
          entity,
          entityId: req.params.id || req.body._id,
          details: req.body,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
    } catch (error) {
      console.error('Audit log error:', error);
    }
    next();
  };
}
