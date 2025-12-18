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
      populate: { path: 'employee', select: 'fullName employeeId epfNumber email nic designation department' }
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
      
      // Get base performance salary rates
      const probationPerformance = employee.performanceSalaryProbation || 0;
      const confirmedPerformance = employee.performanceSalaryConfirmed || 0;
      
      console.log(`Employee ${employee.fullName}:`);
      console.log(`  status in DB:`, employee.status);
      console.log(`  performanceSalaryProbation:`, probationPerformance);
      console.log(`  performanceSalaryConfirmed:`, confirmedPerformance);
      console.log(`  probationEndDate:`, employee.probationEndDate);
      console.log(`  statusUpdateDate:`, employee.statusUpdateDate);
      
      // Calculate performance salary based on DB status directly (manual admin selection)
      // Do NOT auto-determine status from probationEndDate - respect the manually set status
      let performanceSalary = 0;
      
      if (employee.status === 'confirmed') {
        performanceSalary = confirmedPerformance;
        console.log(`  Using confirmed performance salary (status is confirmed)`);
      } else if (employee.status === 'under_probation') {
        performanceSalary = probationPerformance;
        console.log(`  Using probation performance salary (status is under_probation)`);
      } else {
        // Closed or other status - use confirmed rate
        performanceSalary = confirmedPerformance;
        console.log(`  Using confirmed performance salary (status is ${employee.status})`);
      }
      
      console.log(`  FINAL performanceSalary: ${performanceSalary}`);
      
      // Calculate deficit salary if applicable
      // Deficit = difference in performance salary from probationEndDate to last day of payroll month
      // Only applies when employee is confirmed and probation ended before/during the payroll month
      let deficitSalary = 0;
      
      if (employee.status === 'confirmed' && 
          employee.probationEndDate && 
          confirmedPerformance > probationPerformance) {
        
        const probationEnd = new Date(employee.probationEndDate);
        const probationEndMonth = probationEnd.getMonth() + 1; // 1-indexed
        const probationEndYear = probationEnd.getFullYear();
        
        // Only calculate deficit if probation ended in a month before or equal to the payroll month
        // and the payroll month is on or after the probation end month
        const payrollMonthStart = new Date(year, month - 1, 1);
        const payrollMonthEnd = new Date(year, month, 0); // Last day of payroll month
        
        // Calculate deficit only if probation ended before or during the payroll month
        if (probationEnd <= payrollMonthEnd) {
          // Deficit start: max of (probationEndDate, first day of payroll month)
          const deficitStart = probationEnd > payrollMonthStart ? probationEnd : payrollMonthStart;
          
          // Deficit end: last day of payroll month
          const deficitEnd = payrollMonthEnd;
          
          // Only calculate if deficit start is within the payroll month
          if (deficitStart <= deficitEnd && deficitStart >= payrollMonthStart) {
            const diffTime = deficitEnd.getTime() - deficitStart.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
            
            if (diffDays > 0) {
              // Use fixed 30 days for daily rate calculation (per company policy)
              const STANDARD_WORKING_DAYS = 30;
              const dailyProbationPerformance = probationPerformance / STANDARD_WORKING_DAYS;
              const dailyConfirmedPerformance = confirmedPerformance / STANDARD_WORKING_DAYS;
              const dailyDifference = dailyConfirmedPerformance - dailyProbationPerformance;
              deficitSalary = Math.round(dailyDifference * diffDays * 100) / 100;
              console.log(`  Deficit calculation: from ${deficitStart.toISOString().split('T')[0]} to ${deficitEnd.toISOString().split('T')[0]} = ${diffDays} days x (${dailyConfirmedPerformance.toFixed(2)} - ${dailyProbationPerformance.toFixed(2)}) = ${deficitSalary}`);
            }
          } else {
            console.log(`  No deficit for this month (probation end not in this payroll period)`);
          }
        } else {
          console.log(`  No deficit for this month (probation ends after payroll month)`);
        }
      }
      
      const transportAllowance = employee.transportAllowance || 0;
      const grossSalary = basicSalary + performanceSalary + transportAllowance;
      
      const epfEmployeeRate = employee.epfEmployeeRate || taxRates.epfEmployee;
      const epfEmployerRate = employee.epfEmployerRate || taxRates.epfEmployer;
      const etfRate = employee.etfRate || taxRates.etf;
      const stampFee = taxRates.stampFee;
      
      // EPF and ETF calculated on (Basic + Performance Salary)
      const epfEtfBase = basicSalary + performanceSalary;
      const epfEmployee = Math.round((epfEtfBase * epfEmployeeRate / 100) * 100) / 100;
      const epfEmployer = Math.round((epfEtfBase * epfEmployerRate / 100) * 100) / 100;
      const etf = Math.round((epfEtfBase * etfRate / 100) * 100) / 100;
      
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
      
      // Get base performance salary rates
      const probationPerformance = employee.performanceSalaryProbation || 0;
      const confirmedPerformance = employee.performanceSalaryConfirmed || 0;
      
      // Calculate daily rates
      const dailyProbationRate = probationPerformance / workingDays;
      const dailyConfirmedRate = confirmedPerformance / workingDays;
      
      // Calculate default performance salary based on probation end date
      let defaultPerformanceSalary = 0;
      
      if (employee.status === 'confirmed') {
        if (employee.probationEndDate) {
          const probationEnd = new Date(employee.probationEndDate);
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0);
          
          if (probationEnd >= monthStart && probationEnd <= monthEnd) {
            const daysUnderProbation = probationEnd.getDate();
            const daysConfirmed = workingDays - daysUnderProbation;
            defaultPerformanceSalary = Math.round((dailyProbationRate * daysUnderProbation + dailyConfirmedRate * daysConfirmed) * 100) / 100;
          } else {
            defaultPerformanceSalary = confirmedPerformance;
          }
        } else {
          defaultPerformanceSalary = confirmedPerformance;
        }
      } else if (employee.status === 'under_probation') {
        if (employee.probationEndDate) {
          const probationEnd = new Date(employee.probationEndDate);
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0);
          
          if (probationEnd >= monthStart && probationEnd <= monthEnd) {
            const daysUnderProbation = probationEnd.getDate();
            const daysConfirmed = workingDays - daysUnderProbation;
            defaultPerformanceSalary = Math.round((dailyProbationRate * daysUnderProbation + dailyConfirmedRate * daysConfirmed) * 100) / 100;
          } else {
            defaultPerformanceSalary = probationPerformance;
          }
        } else {
          defaultPerformanceSalary = probationPerformance;
        }
      } else {
        defaultPerformanceSalary = confirmedPerformance;
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
      
      // EPF and ETF calculated on (Basic + Performance Salary)
      const epfEtfBase = basicSalary + performanceSalary;
      const epfEmployee = Math.round((epfEtfBase * epfEmployeeRate / 100) * 100) / 100;
      const epfEmployer = Math.round((epfEtfBase * epfEmployerRate / 100) * 100) / 100;
      const etf = Math.round((epfEtfBase * etfRate / 100) * 100) / 100;
      
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
    let totalEPFEmployee = 0;
    let totalETF = 0;
    let totalAPIT = 0;
    let totalStampFee = 0;
    
    // Accumulate statutory contributions from payroll entries
    for (const payrollEntry of run.payrollEntries as any[]) {
      totalEPFEmployer += payrollEntry.epfEmployer || 0;
      totalEPFEmployee += payrollEntry.epfEmployee || 0;
      totalETF += payrollEntry.etf || 0;
      totalAPIT += payrollEntry.apit || 0;
      totalStampFee += payrollEntry.stampFee || 0;
    }
    
    const monthName = new Date(0, run.month - 1).toLocaleString('default', { month: 'long' });
    
    // Create expense entry for EPF employer contribution
    if (totalEPFEmployer > 0) {
      const epfEmployerSerial = await getNextSequence('expense', 'EXP');
      await Expense.create({
        serialNumber: epfEmployerSerial,
        category: 'Payroll',
        description: `EPF Employer Contribution (${monthName} ${run.year})`,
        amount: totalEPFEmployer,
        currency: 'LKR',
        date: new Date(),
        paymentMethod: 'bank',
        bank: bankId,
        status: 'approved',
        createdBy: req.user._id
      });
    }
    
    // Create expense entry for EPF employee contribution
    if (totalEPFEmployee > 0) {
      const epfEmployeeSerial = await getNextSequence('expense', 'EXP');
      await Expense.create({
        serialNumber: epfEmployeeSerial,
        category: 'Payroll',
        description: `EPF Employee Contribution (${monthName} ${run.year})`,
        amount: totalEPFEmployee,
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
        description: `ETF Contribution (${monthName} ${run.year})`,
        amount: totalETF,
        currency: 'LKR',
        date: new Date(),
        paymentMethod: 'bank',
        bank: bankId,
        status: 'approved',
        createdBy: req.user._id
      });
    }
    
    // Create expense entry for APIT
    if (totalAPIT > 0) {
      const apitSerial = await getNextSequence('expense', 'EXP');
      await Expense.create({
        serialNumber: apitSerial,
        category: 'Payroll',
        description: `APIT Tax Deduction (${monthName} ${run.year})`,
        amount: totalAPIT,
        currency: 'LKR',
        date: new Date(),
        paymentMethod: 'bank',
        bank: bankId,
        status: 'approved',
        createdBy: req.user._id
      });
    }
    
    // Create expense entry for Stamp Fee
    if (totalStampFee > 0) {
      const stampSerial = await getNextSequence('expense', 'EXP');
      await Expense.create({
        serialNumber: stampSerial,
        category: 'Payroll',
        description: `Stamp Fee Deduction (${monthName} ${run.year})`,
        amount: totalStampFee,
        currency: 'LKR',
        date: new Date(),
        paymentMethod: 'bank',
        bank: bankId,
        status: 'approved',
        createdBy: req.user._id
      });
    }
    
    // Update bank balance - decrease only for statutory contributions (not employee net salary)
    const totalStatutoryDeduction = totalEPFEmployer + totalETF;
    bank.balance -= totalStatutoryDeduction;
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

// Rollback a paid payroll run (admin only)
router.post('/:id/rollback', requireRole('admin'), auditLog('rollback', 'payrollrun'), async (req: any, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id).populate({
      path: 'payrollEntries',
      populate: { path: 'employee bank' }
    });
    
    if (!run) return res.status(404).json({ error: 'Not found' });
    
    if (run.status !== 'paid') {
      return res.status(400).json({ error: 'Can only rollback paid payroll runs' });
    }
    
    const Bank = require('../models/Bank').default;
    const Expense = require('../models/Expense').default;
    const Attendance = require('../models/Attendance').default;
    
    const monthName = new Date(0, run.month - 1).toLocaleString('default', { month: 'long' });
    
    // Calculate totals from payroll entries to restore bank balance
    let totalEPFEmployer = 0;
    let totalETF = 0;
    
    for (const payrollEntry of run.payrollEntries as any[]) {
      totalEPFEmployer += payrollEntry.epfEmployer || 0;
      totalETF += payrollEntry.etf || 0;
    }
    
    // Find and restore bank balance
    const firstEntry = run.payrollEntries[0] as any;
    if (firstEntry?.bank) {
      const bankId = firstEntry.bank._id || firstEntry.bank;
      const bank = await Bank.findById(bankId);
      if (bank) {
        // Restore only the statutory deductions (not employee net salary)
        const totalStatutoryDeduction = totalEPFEmployer + totalETF;
        bank.balance += totalStatutoryDeduction;
        bank.updatedAt = new Date();
        await bank.save();
      }
    }
    
    // Delete expense entries created during processing
    const expenseDescriptions = [
      `EPF Employer Contribution (${monthName} ${run.year})`,
      `EPF Employee Contribution (${monthName} ${run.year})`,
      `ETF Contribution (${monthName} ${run.year})`,
      `APIT Tax Deduction (${monthName} ${run.year})`,
      `Stamp Fee Deduction (${monthName} ${run.year})`
    ];
    
    await Expense.deleteMany({
      description: { $in: expenseDescriptions },
      category: 'Payroll'
    });
    
    // Reset payroll run status to draft
    run.status = 'draft';
    run.paidDate = undefined;
    run.approvedBy = undefined;
    run.approvedAt = undefined;
    run.submittedBy = undefined;
    run.submittedAt = undefined;
    run.updatedAt = new Date();
    await run.save();
    
    // Reset all payroll entries to draft status
    await Payroll.updateMany(
      { _id: { $in: run.payrollEntries } },
      { status: 'draft', paidDate: null, bank: null }
    );
    
    // Delete attendance records associated with this payroll run
    await Attendance.deleteMany({ payrollRun: run._id });
    
    res.json({ 
      message: 'Payroll run rolled back successfully',
      run
    });
  } catch (error) {
    console.error('Rollback payroll error:', error);
    res.status(500).json({ error: 'Failed to rollback payroll' });
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
