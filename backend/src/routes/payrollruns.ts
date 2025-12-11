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

// Allow admin and accountant to access payroll routes
const requirePayrollAccess = requireRole(['admin', 'accountant']);

router.get('/', requirePayrollAccess, async (req, res) => {
  const runs = await PayrollRun.find()
    .populate('createdBy', 'email')
    .populate('submittedBy', 'email')
    .populate('approvedBy', 'email')
    .populate('rejectedBy', 'email')
    .sort({ year: -1, month: -1 })
    .lean();
  res.json(runs);
});

router.get('/:id', requirePayrollAccess, async (req, res) => {
  const run = await PayrollRun.findById(req.params.id)
    .populate('createdBy', 'email')
    .populate('submittedBy', 'email')
    .populate('approvedBy', 'email')
    .populate('rejectedBy', 'email')
    .populate({
      path: 'payrollEntries',
      populate: { path: 'employee', select: 'fullName employeeId email' }
    });
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});

// Helper: Get working days for a calendar month (including weekends)
function getWorkingDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate(); // Returns total days in month
}

router.post('/preview', requirePayrollAccess, async (req: any, res) => {
  try {
    const { month, year, employeeIds } = req.body;
    
    // Get employees that are not closed
    const employees = await Employee.find({ 
      _id: { $in: employeeIds },
      status: { $ne: 'closed' }
    });
    
    const taxRates = await getActiveTaxRates();
    const workingDays = getWorkingDaysInMonth(month, year);
    const previewData = [];
    
    // Create payroll period end date (last day of the payroll month) - set to end of day
    // JavaScript months are 0-indexed, so month parameter here is already 1-indexed from frontend
    // new Date(2025, 9, 0) = September 30, 2025 (day 0 of October = last day of September)
    const payrollPeriodEnd = new Date(year, month, 0, 23, 59, 59, 999);
    
    console.log('=== PAYROLL DEBUG ===');
    console.log('Input month (1-indexed):', month, 'year:', year);
    console.log('Payroll period end:', payrollPeriodEnd.toISOString());
    
    for (const employee of employees) {
      const basicSalary = employee.basicSalary;
      
      // Determine performance salary based on employee status field
      let performanceSalary = 0;
      
      console.log(`Employee ${employee.fullName}:`);
      console.log(`  status in DB:`, employee.status);
      console.log(`  performanceSalaryProbation:`, employee.performanceSalaryProbation);
      console.log(`  performanceSalaryConfirmed:`, employee.performanceSalaryConfirmed);
      
      if (employee.status === 'confirmed') {
        performanceSalary = employee.performanceSalaryConfirmed || 0;
        console.log(`  RESULT: Status is confirmed, using CONFIRMED salary: ${performanceSalary}`);
      } else if (employee.status === 'under_probation') {
        performanceSalary = employee.performanceSalaryProbation || 0;
        console.log(`  RESULT: Status is under_probation, using PROBATION salary: ${performanceSalary}`);
      } else {
        // Closed or other status - use confirmed salary
        performanceSalary = employee.performanceSalaryConfirmed || 0;
        console.log(`  RESULT: Status is ${employee.status}, using CONFIRMED salary: ${performanceSalary}`);
      }
      
      console.log(`  FINAL performanceSalary: ${performanceSalary}`);
      
      // Calculate deficit salary if applicable
      let deficitSalary = 0;
      if (employee.status === 'confirmed' && 
          employee.probationEndDate && 
          employee.statusUpdateDate &&
          employee.performanceSalaryConfirmed > employee.performanceSalaryProbation) {
        
        const probationEnd = new Date(employee.probationEndDate);
        const statusUpdate = new Date(employee.statusUpdateDate);
        
        // Calculate days between probation end and status update
        const diffTime = statusUpdate.getTime() - probationEnd.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          // Calculate daily rate difference
          const dailyDifference = (employee.performanceSalaryConfirmed - employee.performanceSalaryProbation) / 30;
          deficitSalary = Math.round(dailyDifference * diffDays * 100) / 100;
          console.log(`  Deficit calculation: ${diffDays} days x ${dailyDifference.toFixed(2)} = ${deficitSalary}`);
        }
      }
      
      const transportAllowance = employee.transportAllowance || 0;
      const grossSalary = basicSalary + performanceSalary + transportAllowance;
      
      const epfEmployeeRate = employee.epfEmployeeRate || taxRates.epfEmployee;
      const epfEmployerRate = employee.epfEmployerRate || taxRates.epfEmployer;
      const etfRate = employee.etfRate || taxRates.etf;
      const stampFee = taxRates.stampFee;
      
      const epfEmployee = Math.round((basicSalary * epfEmployeeRate / 100) * 100) / 100;
      const epfEmployer = Math.round((basicSalary * epfEmployerRate / 100) * 100) / 100;
      const etf = Math.round((basicSalary * etfRate / 100) * 100) / 100;
      
      // Calculate APIT - Scenario A only (employee pays)
      const apit = calculateAPIT(grossSalary, 'employee');
      
      // Scenario A: Employee pays APIT - deducted from salary
      const deductions = epfEmployee + apit + stampFee;
      const netSalary = grossSalary - deductions;
      const ctc = grossSalary + epfEmployer + etf;
      
      previewData.push({
        employee: {
          _id: employee._id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          status: employee.status
        },
        basicSalary,
        performanceSalary,
        transportAllowance,
        grossSalary,
        epfEmployee,
        epfEmployer,
        etf,
        apit,
        stampFee,
        totalDeductions: deductions,
        netSalary,
        totalCTC: ctc,
        workingDays,
        deficitSalary,
        includeDeficitInPayroll: false
      });
    }
    
    res.json(previewData);
  } catch (error) {
    console.error('Preview payroll error:', error);
    res.status(500).json({ error: 'Failed to preview payroll' });
  }
});

router.post('/generate', requirePayrollAccess, auditLog('create', 'payrollrun'), async (req: any, res) => {
  try {
    const { month, year, employeeIds, employeeData } = req.body;
    
    const runNumber = await getNextSequence('payrollrun', 'RUN');
    const workingDays = getWorkingDaysInMonth(month, year);
    
    // Get employees that are not closed
    const employees = await Employee.find({ 
      _id: { $in: employeeIds },
      status: { $ne: 'closed' }
    });
    
    // Create a map of employee data (performance salary, transport allowance, deductions, deficit)
    const employeeDataMap = new Map();
    if (employeeData && Array.isArray(employeeData)) {
      employeeData.forEach((data: any) => {
        employeeDataMap.set(data.employeeId, {
          performanceSalary: data.performanceSalary,
          transportAllowance: data.transportAllowance,
          deductionAmount: data.deductionAmount || 0,
          deductionReason: data.deductionReason || '',
          deficitSalary: data.deficitSalary || 0,
          includeDeficitInPayroll: data.includeDeficitInPayroll || false
        });
      });
    }
    
    // Get active tax rates
    const taxRates = await getActiveTaxRates();
    
    const payrollEntries = [];
    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;
    let totalCTC = 0;
    
    // Create payroll period end date (last day of the payroll month) - set to end of day
    const payrollPeriodEnd = new Date(year, month, 0, 23, 59, 59, 999); // Last day of the month at end of day
    
    for (const employee of employees) {
      const serialNumber = await getNextSequence('payroll', 'PAY');
      const basicSalary = employee.basicSalary;
      
      // Get employee-specific data from the map
      const empData = employeeDataMap.get(employee._id.toString());
      
      // Determine performance salary based on employee status field
      let defaultPerformanceSalary = 0;
      if (employee.status === 'confirmed') {
        defaultPerformanceSalary = employee.performanceSalaryConfirmed || 0;
      } else if (employee.status === 'under_probation') {
        defaultPerformanceSalary = employee.performanceSalaryProbation || 0;
      } else {
        // Closed or other status
        defaultPerformanceSalary = employee.performanceSalaryConfirmed || 0;
      }
      
      const performanceSalary = empData?.performanceSalary ?? defaultPerformanceSalary;
      const transportAllowance = empData?.transportAllowance ?? (employee.transportAllowance || 0);
      const deductionAmount = empData?.deductionAmount || 0;
      const deductionReason = empData?.deductionReason || '';
      const deficitSalary = empData?.deficitSalary || 0;
      const includeDeficitInPayroll = empData?.includeDeficitInPayroll || false;
      
      // Calculate gross salary - include deficit if flag is set
      const deficitAmount = includeDeficitInPayroll ? deficitSalary : 0;
      const grossSalary = basicSalary + performanceSalary + transportAllowance + deficitAmount;
      
      // Use rates from TaxConfig, fall back to employee-specific rates if set
      const epfEmployeeRate = employee.epfEmployeeRate || taxRates.epfEmployee;
      const epfEmployerRate = employee.epfEmployerRate || taxRates.epfEmployer;
      const etfRate = employee.etfRate || taxRates.etf;
      const stampFee = taxRates.stampFee;
      
      const epfEmployee = Math.round((basicSalary * epfEmployeeRate / 100) * 100) / 100;
      const epfEmployer = Math.round((basicSalary * epfEmployerRate / 100) * 100) / 100;
      const etf = Math.round((basicSalary * etfRate / 100) * 100) / 100;
      
      // Calculate APIT - Scenario A only (employee pays)
      const apit = calculateAPIT(grossSalary, 'employee');
      
      // Scenario A: Employee pays APIT - deducted from salary
      const deductions = epfEmployee + apit + stampFee + deductionAmount;
      const netSalary = grossSalary - deductions;
      const ctc = grossSalary + epfEmployer + etf;
      
      const payroll = await Payroll.create({
        serialNumber,
        employee: employee._id,
        month,
        year,
        basicSalary,
        performanceSalary,
        transportAllowance,
        grossSalary,
        epfEmployee,
        epfEmployer,
        etf,
        apit,
        stampFee,
        deductionAmount,
        deductionReason,
        deficitSalary,
        includeDeficitInPayroll,
        totalDeductions: deductions,
        netSalary,
        totalCTC: ctc,
        workingDays,
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

router.put('/:id', requirePayrollAccess, auditLog('update', 'payrollrun'), async (req, res) => {
  const run = await PayrollRun.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});

// Update payroll entries for draft payroll run
router.put('/:id/entries', requirePayrollAccess, auditLog('update', 'payrollrun'), async (req: any, res) => {
  try {
    const { entries } = req.body;
    
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    if (run.status !== 'draft') {
      return res.status(400).json({ error: 'Can only edit draft payroll runs' });
    }
    
    const taxRates = await getActiveTaxRates();
    
    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;
    let totalCTC = 0;
    
    // Update each payroll entry
    for (const entryData of entries) {
      const payroll = await Payroll.findById(entryData._id).populate('employee');
      if (!payroll) continue;
      
      const employee = payroll.employee as any;
      const basicSalary = payroll.basicSalary;
      const performanceSalary = entryData.performanceSalary ?? (payroll as any).performanceSalary ?? 0;
      const transportAllowance = entryData.transportAllowance ?? (payroll as any).transportAllowance ?? 0;
      const deductionAmount = entryData.deductionAmount ?? payroll.deductionAmount;
      const deductionReason = entryData.deductionReason ?? payroll.deductionReason;
      const grossSalary = basicSalary + performanceSalary + transportAllowance;
      
      const epfEmployeeRate = employee?.epfEmployeeRate || taxRates.epfEmployee;
      const epfEmployerRate = employee?.epfEmployerRate || taxRates.epfEmployer;
      const etfRate = employee?.etfRate || taxRates.etf;
      const stampFee = taxRates.stampFee;
      
      const epfEmployee = Math.round((basicSalary * epfEmployeeRate / 100) * 100) / 100;
      const epfEmployer = Math.round((basicSalary * epfEmployerRate / 100) * 100) / 100;
      const etf = Math.round((basicSalary * etfRate / 100) * 100) / 100;
      
      // APIT - Scenario A only (employee pays)
      const apit = calculateAPIT(grossSalary, 'employee');
      
      // Scenario A: Employee pays APIT
      const deductions = epfEmployee + apit + stampFee + deductionAmount;
      const netSalary = grossSalary - deductions;
      const ctc = grossSalary + epfEmployer + etf;
      
      await Payroll.findByIdAndUpdate(entryData._id, {
        performanceSalary,
        transportAllowance,
        grossSalary,
        epfEmployee,
        epfEmployer,
        etf,
        apit,
        stampFee,
        deductionAmount,
        deductionReason,
        totalDeductions: deductions,
        netSalary,
        totalCTC: ctc,
        updatedAt: new Date()
      });
      
      totalGross += grossSalary;
      totalNet += netSalary;
      totalDeductions += deductions;
      totalCTC += ctc;
    }
    
    // Update payroll run totals
    await PayrollRun.findByIdAndUpdate(req.params.id, {
      totalGrossSalary: totalGross,
      totalNetSalary: totalNet,
      totalDeductions,
      updatedAt: new Date()
    });
    
    // Return updated run with populated entries
    const updatedRun = await PayrollRun.findById(req.params.id)
      .populate('createdBy', 'email')
      .populate({
        path: 'payrollEntries',
        populate: { path: 'employee', select: 'fullName employeeId status' }
      });
    
    res.json(updatedRun);
  } catch (error) {
    console.error('Update payroll entries error:', error);
    res.status(500).json({ error: 'Failed to update payroll entries' });
  }
});

// Submit payroll for approval (accountant submits, admin can skip)
router.post('/:id/submit', requirePayrollAccess, auditLog('update', 'payrollrun'), async (req: any, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Not found' });
    
    if (run.status !== 'draft') {
      return res.status(400).json({ error: 'Can only submit draft payroll runs' });
    }
    
    // If user is admin, auto-approve
    if (req.user.role === 'admin') {
      run.status = 'approved';
      run.approvedBy = req.user._id;
      run.approvedAt = new Date();
    } else {
      // Accountant submits for approval
      run.status = 'pending_approval';
      run.submittedBy = req.user._id;
      run.submittedAt = new Date();
    }
    
    run.updatedAt = new Date();
    await run.save();
    
    res.json(run);
  } catch (error) {
    console.error('Submit payroll error:', error);
    res.status(500).json({ error: 'Failed to submit payroll' });
  }
});

// Approve payroll (admin only)
router.post('/:id/approve', requireRole('admin'), auditLog('update', 'payrollrun'), async (req: any, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Not found' });
    
    if (run.status !== 'pending_approval') {
      return res.status(400).json({ error: 'Payroll is not pending approval' });
    }
    
    run.status = 'approved';
    run.approvedBy = req.user._id;
    run.approvedAt = new Date();
    run.updatedAt = new Date();
    await run.save();
    
    res.json(run);
  } catch (error) {
    console.error('Approve payroll error:', error);
    res.status(500).json({ error: 'Failed to approve payroll' });
  }
});

// Reject payroll (admin only)
router.post('/:id/reject', requireRole('admin'), auditLog('update', 'payrollrun'), async (req: any, res) => {
  try {
    const { reason } = req.body;
    
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Not found' });
    
    if (run.status !== 'pending_approval') {
      return res.status(400).json({ error: 'Payroll is not pending approval' });
    }
    
    run.status = 'rejected';
    run.rejectedBy = req.user._id;
    run.rejectedAt = new Date();
    run.rejectionReason = reason || 'No reason provided';
    run.updatedAt = new Date();
    await run.save();
    
    res.json(run);
  } catch (error) {
    console.error('Reject payroll error:', error);
    res.status(500).json({ error: 'Failed to reject payroll' });
  }
});

// Revert rejected payroll to draft for re-editing
router.post('/:id/revert', requirePayrollAccess, auditLog('update', 'payrollrun'), async (req: any, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Not found' });
    
    if (run.status !== 'rejected') {
      return res.status(400).json({ error: 'Can only revert rejected payroll runs' });
    }
    
    run.status = 'draft';
    run.rejectionReason = undefined;
    run.rejectedBy = undefined;
    run.rejectedAt = undefined;
    run.submittedBy = undefined;
    run.submittedAt = undefined;
    run.updatedAt = new Date();
    await run.save();
    
    res.json(run);
  } catch (error) {
    console.error('Revert payroll error:', error);
    res.status(500).json({ error: 'Failed to revert payroll' });
  }
});

router.post('/:id/process', requireRole('admin'), auditLog('update', 'payrollrun'), async (req: any, res) => {
  try {
    const { bankId } = req.body;
    
    if (!bankId) {
      return res.status(400).json({ error: 'Bank account is required' });
    }
    
    const run = await PayrollRun.findById(req.params.id).populate({
      path: 'payrollEntries',
      populate: { path: 'employee' }
    });
    
    if (!run) return res.status(404).json({ error: 'Not found' });
    if (run.status === 'paid') return res.status(400).json({ error: 'Already processed' });
    
    // Only allow processing if approved or draft (for admin direct processing)
    if (run.status !== 'approved' && run.status !== 'draft') {
      return res.status(400).json({ error: 'Payroll must be approved before processing' });
    }
    
    const Bank = require('../models/Bank').default;
    const bank = await Bank.findById(bankId);
    if (!bank) return res.status(404).json({ error: 'Bank not found' });
    
    const Expense = require('../models/Expense').default;
    const { getNextSequence } = require('../services/counterService');
    
    // Calculate total statutory contributions
    let totalEPFEmployer = 0;
    let totalETF = 0;
    
    // Accumulate statutory contributions from payroll entries
    for (const payrollEntry of run.payrollEntries as any[]) {
      totalEPFEmployer += payrollEntry.epfEmployer || 0;
      totalETF += payrollEntry.etf || 0;
    }
    
    // Create expense entry for EPF employer contribution
    if (totalEPFEmployer > 0) {
      const epfSerial = await getNextSequence('expense', 'EXP');
      await Expense.create({
        serialNumber: epfSerial,
        category: 'Payroll',
        description: `EPF Employer Contribution (${new Date(0, run.month - 1).toLocaleString('default', { month: 'long' })} ${run.year})`,
        amount: totalEPFEmployer,
        currency: 'LKR',
        date: new Date(),
        paymentMethod: 'bank',
        bank: bankId,
        status: 'approved',
        createdBy: req.user._id
      });
    }
    
    // Create expense entry for ETF
    if (totalETF > 0) {
      const etfSerial = await getNextSequence('expense', 'EXP');
      await Expense.create({
        serialNumber: etfSerial,
        category: 'Payroll',
        description: `ETF Contribution (${new Date(0, run.month - 1).toLocaleString('default', { month: 'long' })} ${run.year})`,
        amount: totalETF,
        currency: 'LKR',
        date: new Date(),
        paymentMethod: 'bank',
        bank: bankId,
        status: 'approved',
        createdBy: req.user._id
      });
    }
    
    // Update bank balance - decrease for payroll payment and statutory contributions
    const totalDeduction = run.totalNetSalary + totalEPFEmployer + totalETF;
    bank.balance -= totalDeduction;
    bank.updatedAt = new Date();
    await bank.save();
    
    // Update run status
    run.status = 'paid';
    run.paidDate = new Date();
    await run.save();
    
    // Update all payroll entries status and bank reference
    await Payroll.updateMany(
      { _id: { $in: run.payrollEntries } },
      { status: 'paid', paidDate: new Date(), bank: bankId }
    );
    
    res.json(run);
  } catch (error) {
    console.error('Process payroll error:', error);
    res.status(500).json({ error: 'Failed to process payroll' });
  }
});

router.delete('/:id', requirePayrollAccess, auditLog('delete', 'payrollrun'), async (req: any, res) => {
  const run = await PayrollRun.findById(req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  
  // Only allow deletion of draft or rejected payrolls
  if (run.status !== 'draft' && run.status !== 'rejected') {
    return res.status(400).json({ error: 'Can only delete draft or rejected payroll runs' });
  }
  
  // Delete associated payroll entries
  await Payroll.deleteMany({ _id: { $in: run.payrollEntries } });
  
  await PayrollRun.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
