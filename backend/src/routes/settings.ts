import express from 'express';
import Settings from '../models/Settings';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

// Default settings values
const defaultCompanySettings = {
  companyName: 'VeloSync Accounts',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  taxNumber: '',
  currency: 'LKR',
  dateFormat: 'DD/MM/YYYY',
  fiscalYearStart: '01-01'
};

const defaultAppSettings = {
  defaultPaymentTerms: 30,
  defaultInvoiceDuedays: 14,
  defaultCurrency: 'LKR',
  stampFee: 25,
  emailNotifications: true,
  autoApproveAdminTransactions: true
};

const defaultEmailSettings = {
  smtpHost: '',
  smtpPort: '',
  smtpUser: '',
  smtpPassword: ''
};

// Get all settings (admin only)
router.get('/', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const settings = await Settings.find();
    
    // Return settings with defaults for missing types
    const result = {
      company: settings.find(s => s.type === 'company')?.data || defaultCompanySettings,
      defaults: settings.find(s => s.type === 'defaults')?.data || defaultAppSettings,
      email: settings.find(s => s.type === 'email')?.data || defaultEmailSettings
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get specific settings type
router.get('/:type', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { type } = req.params;
    
    if (!['company', 'defaults', 'email'].includes(type)) {
      return res.status(400).json({ error: 'Invalid settings type' });
    }
    
    // Only admin can access email settings
    if (type === 'email' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const settings = await Settings.findOne({ type });
    
    // Return defaults if not found
    let defaultData;
    switch (type) {
      case 'company':
        defaultData = defaultCompanySettings;
        break;
      case 'defaults':
        defaultData = defaultAppSettings;
        break;
      case 'email':
        defaultData = defaultEmailSettings;
        break;
    }
    
    res.json(settings?.data || defaultData);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings (admin only)
router.put('/:type', requireAuth, requireRole('admin'), auditLog('update', 'Settings'), async (req: AuthRequest, res) => {
  try {
    const { type } = req.params;
    const data = req.body;
    
    if (!['company', 'defaults', 'email'].includes(type)) {
      return res.status(400).json({ error: 'Invalid settings type' });
    }
    
    const settings = await Settings.findOneAndUpdate(
      { type },
      { 
        type,
        data,
        updatedBy: req.user?._id
      },
      { upsert: true, new: true }
    );
    
    res.json(settings.data);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
