import express from 'express';
import PayrollRun from '../models/PayrollRun';
import Payroll from '../models/Payroll';
import Employee from '../models/Employee';
import { requireAuth, requireRole } from '../middleware/auth';
import { getNextSequence } from '../services/counterService';
import { auditLog } from '../middleware/auditLog';
import { getActiveTaxRates, calculateAPIT } from '../services/taxService';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/', async (req, res) => {
  const runs = await PayrollRun.find()
    .populate('createdBy', 'email')
    .sort({ year: -1, month: -1 })
    .lean();
  res.json(runs);
});

router.get('/:id', async (req, res) => {
  const run = await PayrollRun.findById(req.params.id)
    .populate('createdBy', 'email')
    .populate({
      path: 'payrollEntries',
      populate: { path: 'employee', select: 'fullName employeeId' }
    });
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});

router.post('/preview', async (req: any, res) => {
  try {
    const { month, year, employeeIds } = req.body;
    
    const employees = await Employee.find({ 
      _id: { $in: employeeIds },
      status: 'active'
    });
    
    const taxRates = await getActiveTaxRates();
    const previewData = [];
    
    for (const employee of employees) {
      const basicSalary = employee.basicSalary;
      const allowances = employee.allowances || 0;
      const grossSalary = basicSalary + allowances;
      
      const epfEmployeeRate = employee.epfEmployeeRate || taxRates.epfEmployee;
      const epfEmployerRate = employee.epfEmployerRate || taxRates.epfEmployer;
      const etfRate = employee.etfRate || taxRates.etf;
      const stampFee = taxRates.stampFee;
      
      const epfEmployee = Math.round((basicSalary * epfEmployeeRate / 100) * 100) / 100;
      const epfEmployer = Math.round((basicSalary * epfEmployerRate / 100) * 100) / 100;
      const etf = Math.round((basicSalary * etfRate / 100) * 100) / 100;
      const apit = calculateAPIT(grossSalary, employee.apitScenario || 'employee');
      
      let deductions: number;
      let netSalary: number;
      let apitEmployer = 0;
      let ctc: number;
      
      if (employee.apitScenario === 'employer') {
        deductions = epfEmployee + stampFee;
        netSalary = grossSalary - deductions;
        apitEmployer = apit;
        ctc = grossSalary + epfEmployer + etf + apitEmployer;
      } else {
        deductions = epfEmployee + apit + stampFee;
        netSalary = grossSalary - deductions;
        ctc = grossSalary + epfEmployer + etf;
      }
      
      previewData.push({
        employee: {
          _id: employee._id,
          employeeId: employee.employeeId,
          fullName: employee.fullName
        },
        basicSalary,
        allowances,
        grossSalary,
        epfEmployee,
        epfEmployer,
        etf,
        apit,
        apitEmployer,
        stampFee,
        totalDeductions: deductions,
        netSalary,
        totalCTC: ctc
      });
    }
    
    res.json(previewData);
  } catch (error) {
    console.error('Preview payroll error:', error);
    res.status(500).json({ error: 'Failed to preview payroll' });
  }
});

router.post('/generate', auditLog('create', 'payrollrun'), async (req: any, res) => {
  try {
    const { month, year, employeeIds } = req.body;
    
    const runNumber = await getNextSequence('payrollrun', 'RUN');
    
    const employees = await Employee.find({ 
      _id: { $in: employeeIds },
      status: 'active'
    });
    
    // Get active tax rates
    const taxRates = await getActiveTaxRates();
    
    const payrollEntries = [];
    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;
    let totalCTC = 0;
    
    for (const employee of employees) {
      const serialNumber = await getNextSequence('payroll', 'PAY');
      const basicSalary = employee.basicSalary;
      const allowances = employee.allowances || 0;
      const grossSalary = basicSalary + allowances;
      
      // Use rates from TaxConfig, fall back to employee-specific rates if set
      const epfEmployeeRate = employee.epfEmployeeRate || taxRates.epfEmployee;
      const epfEmployerRate = employee.epfEmployerRate || taxRates.epfEmployer;
      const etfRate = employee.etfRate || taxRates.etf;
      const stampFee = taxRates.stampFee;
      
      const epfEmployee = Math.round((basicSalary * epfEmployeeRate / 100) * 100) / 100;
      const epfEmployer = Math.round((basicSalary * epfEmployerRate / 100) * 100) / 100;
      const etf = Math.round((basicSalary * etfRate / 100) * 100) / 100;
      
      // Calculate APIT based on slab system with standard deductions
      const apit = calculateAPIT(grossSalary, employee.apitScenario || 'employee');
      
      // Calculate based on APIT scenario
      let deductions: number;
      let netSalary: number;
      let apitEmployer = 0;
      let ctc: number;
      
      if (employee.apitScenario === 'employer') {
        // Scenario B: Employer pays APIT
        deductions = epfEmployee + stampFee;
        netSalary = grossSalary - deductions;
        apitEmployer = apit;
        ctc = grossSalary + epfEmployer + etf + apitEmployer;
      } else {
        // Scenario A: Employee pays APIT (default)
        deductions = epfEmployee + apit + stampFee;
        netSalary = grossSalary - deductions;
        ctc = grossSalary + epfEmployer + etf;
      }
      
      const payroll = await Payroll.create({
        serialNumber,
        employee: employee._id,
        month,
        year,
        basicSalary,
        allowances,
        grossSalary,
        epfEmployee,
        epfEmployer,
        etf,
        apit,
        apitEmployer,
        stampFee,
        totalDeductions: deductions,
        netSalary,
        totalCTC: ctc,
        status: 'draft',
        createdBy: req.user._id
      });
      
      payrollEntries.push(payroll._id);
      totalGross += grossSalary;
      totalNet += netSalary;
      totalDeductions += deductions;
      totalCTC += ctc;
    }
    
    const run = await PayrollRun.create({
      runNumber,
      month,
      year,
      totalEmployees: employees.length,
      totalGrossSalary: totalGross,
      totalNetSalary: totalNet,
      totalDeductions,
      payrollEntries,
      status: 'draft',
      createdBy: req.user._id
    });
    
    res.json(run);
  } catch (error) {
    console.error('Generate payroll run error:', error);
    res.status(500).json({ error: 'Failed to generate payroll run' });
  }
});

router.put('/:id', auditLog('update', 'payrollrun'), async (req, res) => {
  const run = await PayrollRun.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});

router.post('/:id/process', auditLog('update', 'payrollrun'), async (req: any, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id).populate({
      path: 'payrollEntries',
      populate: { path: 'employee' }
    });
    
    if (!run) return res.status(404).json({ error: 'Not found' });
    if (run.status === 'paid') return res.status(400).json({ error: 'Already processed' });
    
    const Expense = require('../models/Expense').default;
    const { getNextSequence } = require('../services/counterService');
    
    // Create expense entries for each payroll entry
    for (const payrollEntry of run.payrollEntries as any[]) {
      const serialNumber = await getNextSequence('expense', 'EXP');
      
      await Expense.create({
        serialNumber,
        category: 'Payroll',
        description: `Salary payment - ${payrollEntry.employee.fullName} (${new Date(0, run.month - 1).toLocaleString('default', { month: 'long' })} ${run.year})`,
        amount: payrollEntry.netSalary,
        currency: 'LKR',
        date: new Date(),
        paymentMethod: 'bank',
        status: 'approved',
        createdBy: req.user._id
      });
    }
    
    // Update run status
    run.status = 'paid';
    run.paidDate = new Date();
    await run.save();
    
    // Update all payroll entries status
    await Payroll.updateMany(
      { _id: { $in: run.payrollEntries } },
      { status: 'paid', paidDate: new Date() }
    );
    
    res.json(run);
  } catch (error) {
    console.error('Process payroll error:', error);
    res.status(500).json({ error: 'Failed to process payroll' });
  }
});

router.delete('/:id', auditLog('delete', 'payrollrun'), async (req, res) => {
  const run = await PayrollRun.findById(req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  
  // Delete associated payroll entries
  await Payroll.deleteMany({ _id: { $in: run.payrollEntries } });
  
  await PayrollRun.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
