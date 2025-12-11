import express from 'express';
import Employee from '../models/Employee';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

// Auto-update status for employees whose probation has ended
const updateProbationStatus = async () => {
  const now = new Date();
  await Employee.updateMany(
    {
      status: 'under_probation',
      probationEndDate: { $lte: now, $ne: null }
    },
    { 
      $set: { 
        status: 'confirmed',
        updatedAt: now
      }
    }
  );
};

router.get('/', async (req, res) => {
  // Auto-update probation status before fetching
  await updateProbationStatus();
  const employees = await Employee.find().sort({ fullName: 1 }).lean();
  res.json(employees);
});

router.get('/:id', async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Not found' });
  res.json(employee);
});

router.post('/', auditLog('create', 'employee'), async (req, res) => {
  // Determine initial status based on probation end date
  const data = { ...req.body };
  if (data.probationEndDate && new Date(data.probationEndDate) <= new Date()) {
    data.status = 'confirmed';
  } else if (!data.status) {
    data.status = 'under_probation';
  }
  // Always set workingDaysPerMonth to 30
  data.workingDaysPerMonth = 30;
  
  const employee = await Employee.create(data);
  res.json(employee);
});

router.put('/:id', auditLog('update', 'employee'), async (req, res) => {
  // Use the status from the request body directly - don't auto-override
  const data = { ...req.body, updatedAt: new Date() };
  // Always set workingDaysPerMonth to 30
  data.workingDaysPerMonth = 30;
  
  const employee = await Employee.findByIdAndUpdate(
    req.params.id,
    data,
    { new: true }
  );
  if (!employee) return res.status(404).json({ error: 'Not found' });
  res.json(employee);
});

router.delete('/:id', auditLog('delete', 'employee'), async (req, res) => {
  const employee = await Employee.findByIdAndDelete(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
