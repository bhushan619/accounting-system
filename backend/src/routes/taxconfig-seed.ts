import express from 'express';
import TaxConfig from '../models/TaxConfig';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.post('/seed', async (req, res) => {
  try {
    // Check if tax configs already exist
    const existingCount = await TaxConfig.countDocuments();
    if (existingCount > 0) {
      return res.status(400).json({ error: 'Tax configurations already exist. Please delete them first if you want to reseed.' });
    }

    const now = new Date();
    
    // Create default Sri Lankan tax configurations
    const configs = [
      {
        name: 'EPF Employee Contribution',
        taxType: 'epf_employee',
        rate: 8,
        applicableFrom: now,
        isActive: true
      },
      {
        name: 'EPF Employer Contribution',
        taxType: 'epf_employer',
        rate: 12,
        applicableFrom: now,
        isActive: true
      },
      {
        name: 'ETF Contribution',
        taxType: 'etf',
        rate: 3,
        applicableFrom: now,
        isActive: true
      },
      {
        name: 'Stamp Fee',
        taxType: 'stamp_fee',
        rate: 25,
        applicableFrom: now,
        isActive: true
      },
      {
        name: 'APIT (Monthly Progressive)',
        taxType: 'apit',
        brackets: [
          { minIncome: 0, maxIncome: 100000, rate: 0 },
          { minIncome: 100000, maxIncome: 141667, rate: 6 },
          { minIncome: 141667, maxIncome: 183333, rate: 12 },
          { minIncome: 183333, maxIncome: 225000, rate: 18 },
          { minIncome: 225000, maxIncome: 266667, rate: 24 },
          { minIncome: 266667, maxIncome: 308333, rate: 30 },
          { minIncome: 308333, maxIncome: null, rate: 36 }
        ],
        applicableFrom: now,
        isActive: true
      }
    ];

    await TaxConfig.insertMany(configs);
    
    res.json({ 
      message: 'Tax configurations seeded successfully',
      count: configs.length
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed tax configurations' });
  }
});

export default router;
