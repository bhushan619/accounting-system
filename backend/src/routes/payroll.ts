import express from 'express';
import Payroll from '../models/Payroll';
import Employee from '../models/Employee';
import { requireAuth, requireRole } from '../middleware/auth';
import { getNextSequence } from '../services/counterService';
import { auditLog } from '../middleware/auditLog';
import { validateRequest } from '../middleware/validateRequest';
import { payrollCalculateSchema, payrollCreateSchema } from '../validation/payroll';
import { getActiveTaxRates, calculateAPIT } from '../services/taxService';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/', async (req, res) => {
  const payrolls = await Payroll.find()
    .populate('employee')
    .populate('bank')
    .populate('createdBy', 'email')
    .sort({ year: -1, month: -1 })
    .lean();
  res.json(payrolls);
});

router.get('/:id', async (req, res) => {
  const payroll = await Payroll.findById(req.params.id)
    .populate('employee')
    .populate('bank')
    .populate('createdBy', 'email');
  if (!payroll) return res.status(404).json({ error: 'Not found' });
  res.json(payroll);
});

// Helper: Get working days for a calendar month (including weekends)
function getWorkingDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate(); // Returns total days in month
}

router.post('/calculate', validateRequest(payrollCalculateSchema), async (req: any, res) => {
  try {
    const { employeeId, month, year, performanceSalary: customPerformance, transportAllowance: customTransport } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    
    // Get active tax rates from TaxConfig
    const taxRates = await getActiveTaxRates();
    const workingDays = getWorkingDaysInMonth(month, year);
    
    const basicSalary = employee.basicSalary;
    
    // Determine performance salary based on status/probation
    let performanceSalary = 0;
    let deficitSalary = 0;
    
    const probationPerformance = employee.performanceSalaryProbation || 0;
    const confirmedPerformance = employee.performanceSalaryConfirmed || 0;
    
    if (employee.status === 'confirmed') {
      performanceSalary = confirmedPerformance;
    } else if (employee.status === 'under_probation') {
      if (employee.probationEndDate && new Date() > employee.probationEndDate) {
        performanceSalary = confirmedPerformance;
      } else {
        performanceSalary = probationPerformance;
      }
    }
    
    // Calculate deficit salary if probation ends mid-month in this payroll period
    if (employee.probationEndDate && employee.status === 'under_probation') {
      const probationEnd = new Date(employee.probationEndDate);
      const payrollStart = new Date(year, month - 1, 1); // Month is 1-indexed
      const payrollEnd = new Date(year, month, 0); // Last day of month
      
      if (probationEnd >= payrollStart && probationEnd <= payrollEnd) {
        // Probation ends in this payroll period - calculate deficit from probation end date to end of month
        const deficitStart = new Date(probationEnd.getTime() + (24 * 60 * 60 * 1000)); // Day after probation ends
        const deficitEnd = payrollEnd;
        const diffTime = deficitEnd.getTime() - deficitStart.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
        
        if (diffDays > 0) {
          // Use actual calendar days in the month (30/31/28/29) for daily rate calculation
          const daysInMonth = workingDays; // Already computed as actual calendar days
          const dailyProbationPerformance = probationPerformance / daysInMonth;
          const dailyConfirmedPerformance = confirmedPerformance / daysInMonth;
          const dailyDifference = dailyConfirmedPerformance - dailyProbationPerformance;
          deficitSalary = Math.round(dailyDifference * diffDays * 100) / 100;
          performanceSalary = probationPerformance + deficitSalary;
        }
      }
    }
    
    const finalPerformanceSalary = customPerformance ?? performanceSalary;
    const transportAllowance = customTransport ?? (employee.transportAllowance || 0);
    const grossSalary = basicSalary + finalPerformanceSalary + transportAllowance;
    
    // Use rates from TaxConfig, fall back to employee-specific rates if set
    const epfEmployeeRate = employee.epfEmployeeRate || taxRates.epfEmployee;
    const epfEmployerRate = employee.epfEmployerRate || taxRates.epfEmployer;
    const etfRate = employee.etfRate || taxRates.etf;
    const stampFee = taxRates.stampFee;
    
    // EPF and ETF calculated on (Basic + Performance Salary)
    const epfEtfBase = basicSalary + finalPerformanceSalary;
    const epfEmployee = Math.round((epfEtfBase * epfEmployeeRate / 100) * 100) / 100;
    const epfEmployer = Math.round((epfEtfBase * epfEmployerRate / 100) * 100) / 100;
    const etf = Math.round((epfEtfBase * etfRate / 100) * 100) / 100;
    
    // Calculate APIT - Scenario A only (employee pays)
    const apit = calculateAPIT(grossSalary, 'employee');
    
    // Scenario A: Employee pays APIT - deducted from salary
    const totalDeductions = epfEmployee + apit + stampFee;
    const netSalary = grossSalary - totalDeductions;
    const totalCTC = grossSalary + epfEmployer + etf;
    
    res.json({
      basicSalary,
      performanceSalary: finalPerformanceSalary,
      deficitSalary,
      transportAllowance,
      grossSalary,
      epfEmployee,
      epfEmployer,
      etf,
      apit,
      stampFee,
      totalDeductions,
      netSalary,
      totalCTC,
      workingDays
    });
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate payroll' });
  }
});

router.post('/', validateRequest(payrollCreateSchema), auditLog('create', 'payroll'), async (req: any, res) => {
  try {
    const serialNumber = await getNextSequence('payroll', 'PAY');
    const payroll = await Payroll.create({
      ...req.body,
      serialNumber,
      createdBy: req.user._id
    });
    res.json(payroll);
  } catch (error) {
    console.error('Create payroll error:', error);
    res.status(500).json({ error: 'Failed to create payroll' });
  }
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
