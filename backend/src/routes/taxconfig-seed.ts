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
