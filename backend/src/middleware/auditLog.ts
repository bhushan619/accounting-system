// src/middleware/auditLog.ts
import { Request, Response, NextFunction } from 'express';
import AuditLog from '../models/AuditLog';

// Keep type for user; cast to any for rest
interface AuditRequest extends Request {
  user?: {
    _id: string;
    email?: string;
    role?: string;
  };
}

export function auditLog(action: string, entity: string) {
  return async (req: AuditRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        const anyReq = req as any;

        await AuditLog.create({
          user: req.user._id,
          action,
          entity,
          entityId: anyReq.params?.id || anyReq.body?._id,
          details: anyReq.body,
          ipAddress: anyReq.ip,
          userAgent: anyReq.headers?.['user-agent'],
        });
      }
    } catch (error) {
      console.error('Audit log error:', error);
    }
    next();
  };
}
