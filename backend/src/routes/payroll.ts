import express from 'express';
import Payroll from '../models/Payroll';
import Employee from '../models/Employee';
import { requireAuth, requireRole } from '../middleware/auth';
import { getNextSequence } from '../services/counterService';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/', async (req, res) => {
  const payrolls = await Payroll.find()
    .populate('employee')
    .populate('createdBy', 'email')
    .sort({ year: -1, month: -1 })
    .lean();
  res.json(payrolls);
});

router.get('/:id', async (req, res) => {
  const payroll = await Payroll.findById(req.params.id)
    .populate('employee')
    .populate('createdBy', 'email');
  if (!payroll) return res.status(404).json({ error: 'Not found' });
  res.json(payroll);
});

router.post('/calculate', async (req: any, res) => {
  const { employeeId, month, year, allowances = 0, apit = 0 } = req.body;
  
  const employee = await Employee.findById(employeeId);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  
  const basicSalary = employee.basicSalary;
  const grossSalary = basicSalary + allowances;
  
  const epfEmployee = grossSalary * (employee.epfEmployeeRate / 100);
  const epfEmployer = grossSalary * (employee.epfEmployerRate / 100);
  const etf = grossSalary * (employee.etfRate / 100);
  const stampFee = 25;
  
  const totalDeductions = epfEmployee + apit + stampFee;
  const netSalary = grossSalary - totalDeductions;
  
  res.json({
    basicSalary,
    allowances,
    grossSalary,
    epfEmployee,
    epfEmployer,
    etf,
    apit,
    stampFee,
    totalDeductions,
    netSalary
  });
});

router.post('/', auditLog('create', 'payroll'), async (req: any, res) => {
  const serialNumber = await getNextSequence('payroll', 'PAY');
  const payroll = await Payroll.create({
    ...req.body,
    serialNumber,
    createdBy: req.user._id
  });
  res.json(payroll);
});

router.put('/:id', auditLog('update', 'payroll'), async (req, res) => {
  const payroll = await Payroll.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );
  if (!payroll) return res.status(404).json({ error: 'Not found' });
  res.json(payroll);
});

router.delete('/:id', auditLog('delete', 'payroll'), async (req, res) => {
  const payroll = await Payroll.findByIdAndDelete(req.params.id);
  if (!payroll) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
