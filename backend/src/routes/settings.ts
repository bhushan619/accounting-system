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
  fiscalYearStart: '01-01',
  region: 'LK' // LK = Sri Lanka, AE = UAE
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

// Currency and exchange rate settings
const defaultCurrencySettings = {
  baseCurrency: 'LKR',
  supportedCurrencies: ['LKR', 'AED', 'CNY'],
  exchangeRates: {
    LKR_AED: 0.010, // 1 LKR = 0.010 AED (approx)
    AED_LKR: 100.0, // 1 AED = 100 LKR (approx)
    LKR_CNY: 0.024, // 1 LKR = 0.024 CNY (approx)
    CNY_LKR: 41.67  // 1 CNY = 41.67 LKR (approx)
  },
  vatRates: {
    LK: { standard: 18, zeroRated: 0 },
    AE: { standard: 5, zeroRated: 0 }
  }
};

// Get all settings (admin only)
router.get('/', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const settings = await Settings.find();
    
    // Return settings with defaults for missing types
    const result = {
      company: settings.find(s => s.type === 'company')?.data || defaultCompanySettings,
      defaults: settings.find(s => s.type === 'defaults')?.data || defaultAppSettings,
      email: settings.find(s => s.type === 'email')?.data || defaultEmailSettings,
      currency: settings.find(s => s.type === 'currency')?.data || defaultCurrencySettings
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get specific settings type
router.get('/:type', requireAuth, async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const type = req.params.type as string;
    
    if (!['company', 'defaults', 'email', 'currency'].includes(type)) {
      return res.status(400).json({ error: 'Invalid settings type' });
    }
    
    // Only admin can access email and currency settings
    if ((type === 'email' || type === 'currency') && authReq.user?.role !== 'admin') {
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
      case 'currency':
        defaultData = defaultCurrencySettings;
        break;
    }
    
    res.json(settings?.data || defaultData);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings (admin only)
router.put('/:type', requireAuth, requireRole('admin'), auditLog('update', 'Settings'), async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const type = req.params.type as string;
    const data = req.body;
    
    if (!['company', 'defaults', 'email', 'currency'].includes(type)) {
      return res.status(400).json({ error: 'Invalid settings type' });
    }
    
    const settings = await Settings.findOneAndUpdate(
      { type },
      { 
        type,
        data,
        updatedBy: authReq.user?._id
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
