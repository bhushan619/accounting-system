import { Router, Request, Response } from 'express';
import RolePermission from '../models/RolePermission';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Default permissions for each role
const defaultPermissions: Record<string, string[]> = {
  admin: [
    'Full system access',
    'Manage users and roles',
    'Tax configuration',
    'Employee management',
    'Payroll processing',
    'Approve transactions'
  ],
  accountant: [
    'Create and manage invoices',
    'Record and manage expenses',
    'View financial reports',
    'Manage clients and vendors',
    'View bank accounts'
  ],
  employee: [
    'View own payslips',
    'View personal profile',
    'Request profile updates'
  ]
};

// Get all role permissions
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    let permissions = await RolePermission.find();
    
    // If no permissions exist, seed with defaults
    if (permissions.length === 0) {
      const roles = ['admin', 'accountant', 'employee'];
      for (const role of roles) {
        await RolePermission.create({
          role,
          permissions: defaultPermissions[role]
        });
      }
      permissions = await RolePermission.find();
    }
    
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// Update role permissions (admin only)
router.put('/:role', requireAuth, async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;
    const user = (req as any).user;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!['admin', 'accountant', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const updated = await RolePermission.findOneAndUpdate(
      { role },
      { 
        permissions, 
        updatedAt: new Date(),
        updatedBy: user._id
      },
      { new: true, upsert: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role permissions' });
  }
});

// Reset to default permissions (admin only)
router.post('/reset', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await RolePermission.deleteMany({});
    
    const roles = ['admin', 'accountant', 'employee'];
    for (const role of roles) {
      await RolePermission.create({
        role,
        permissions: defaultPermissions[role],
        updatedBy: user._id
      });
    }

    const permissions = await RolePermission.find();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset permissions' });
  }
});

export default router;
