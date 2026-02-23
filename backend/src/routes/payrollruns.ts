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

router.get('/', requirePayrollAccess, async (_req, res) => {
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
      populate: { path: 'employee', select: 'fullName nickname employeeId epfNumber email nic designation department' }
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
    const { month, year, employeeIds, attendanceData } = req.body;
    
    // Build attendance lookup map by employeeId string
    const attendanceMap = new Map();
    if (attendanceData && Array.isArray(attendanceData)) {
      attendanceData.forEach((a: any) => {
        attendanceMap.set(a.employeeId, a);
      });
    }
    
    // Get employees: active ones + closed employees whose closeDate is within the payroll month
    const payrollMonthStart = new Date(year, month - 1, 1);
    const payrollMonthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const employees = await Employee.find({ 
      _id: { $in: employeeIds },
      $or: [
        { status: { $ne: 'closed' } },
        { status: 'closed', closeDate: { $gte: payrollMonthStart, $lte: payrollMonthEnd } }
      ]
    });
    
    const taxRates = await getActiveTaxRates();
    const workingDays = getWorkingDaysInMonth(month, year);
    const previewData = [];
    
    // Create payroll period end date (last day of the payroll month) - set to end of day
    // JavaScript months are 0-indexed, so month parameter here is already 1-indexed from frontend
    // new Date(2025, 9, 0) = September 30, 2025 (day 0 of October = last day of September)

    for (const employee of employees) {
      const basicSalary = employee.basicSalary;
      const probationPerformance = employee.performanceSalaryProbation || 0;
      const confirmedPerformance = employee.performanceSalaryConfirmed || 0;

      // Calculate performance salary based on DB status (manual admin selection)
      // Do NOT auto-determine from probationEndDate - respect the manually set status
      let performanceSalary = 0;


      if (employee.status === 'confirmed') {
        performanceSalary = confirmedPerformance;
      } else if (employee.status === 'under_probation') {
        performanceSalary = probationPerformance;
      } else {
        performanceSalary = confirmedPerformance;
      }

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
        
        // Calculate deficit only if probation ended WITHIN the payroll month (not before)
        if (probationEnd >= payrollMonthStart && probationEnd <= payrollMonthEnd) {
          // Deficit starts the day after probation ends
          const deficitStart = new Date(probationEnd.getTime() + (24 * 60 * 60 * 1000));
          
          // Deficit end: last day of payroll month
          const deficitEnd = payrollMonthEnd;
          
          // Only calculate if deficit start is within the payroll month
          if (deficitStart <= deficitEnd && deficitStart >= payrollMonthStart) {
            const diffTime = deficitEnd.getTime() - deficitStart.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
            
            if (diffDays > 0) {
              // Use actual calendar days in the month (30/31/28/29) for daily rate calculation
              const daysInMonth = workingDays; // Already computed as actual calendar days
              const dailyProbationPerformance = probationPerformance / daysInMonth;
              const dailyConfirmedPerformance = confirmedPerformance / daysInMonth;
              const dailyDifference = dailyConfirmedPerformance - dailyProbationPerformance;
              deficitSalary = Math.round(dailyDifference * diffDays * 100) / 100;
              
              // Prorate performance salary: probation days at probation rate + confirmed days at confirmed rate
              const probationDays = probationEnd.getDate();
              performanceSalary = Math.round((dailyProbationPerformance * probationDays + dailyConfirmedPerformance * diffDays) * 100) / 100;

            }
          } else {
            // probation end not in this payroll period
          }
        } else {
          // probation ends after payroll month
        }

      }
      
      // Carry-forward deficit: if probation ended in a previous month and deficit was never paid
      // Calculate for ALL unpaid months from probation end to current payroll month
      let deficitDetails = '';
      if (employee.probationEndDate && deficitSalary === 0 && confirmedPerformance > probationPerformance) {
        const probationEnd = new Date(employee.probationEndDate);
        const payrollMonthStart = new Date(year, month - 1, 1);
        
        // Only apply if probation ended before this payroll month
        if (probationEnd < payrollMonthStart) {
          // Check if deficit was already included in any previous payroll entry
          const existingDeficitPayroll = await Payroll.findOne({
            employee: employee._id,
            $or: [
              { deficitSalary: { $gt: 0 } },
              { includeDeficitInPayroll: true },
              { deficitDetails: { $ne: '', $exists: true } }
            ]
          });
          
          if (!existingDeficitPayroll) {
            // Calculate deficit for ALL months from probation end to AND INCLUDING current payroll month
            let totalDeficit = 0;
            const detailParts: string[] = [];
            
            // Start from probation end month, go up to AND INCLUDING the current payroll month
            let curMonth = probationEnd.getMonth(); // 0-indexed
            let curYear = probationEnd.getFullYear();
            
            while (curYear < year || (curYear === year && curMonth < month)) {
              const daysInThisMonth = new Date(curYear, curMonth + 1, 0).getDate();
              const dailyDifference = (confirmedPerformance - probationPerformance) / daysInThisMonth;
              
              let deficitDays = 0;
              const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              
              if (curYear === probationEnd.getFullYear() && curMonth === probationEnd.getMonth()) {
                // Partial month - from day after probation end to end of month
                const dayAfterProbation = probationEnd.getDate() + 1;
                if (dayAfterProbation <= daysInThisMonth) {
                  deficitDays = daysInThisMonth - dayAfterProbation + 1;
                }
              } else {
                // Full month
                deficitDays = daysInThisMonth;
              }
              
              if (deficitDays > 0) {
                const monthDeficit = Math.round(dailyDifference * deficitDays * 100) / 100;
                totalDeficit += monthDeficit;
                detailParts.push(`${monthNames[curMonth]} ${curYear}: ${deficitDays}d × ${dailyDifference.toFixed(2)} = ${monthDeficit.toFixed(2)}`);
              }
              
              // Move to next month
              curMonth++;
              if (curMonth > 11) {
                curMonth = 0;
                curYear++;
              }
            }
            
            if (totalDeficit > 0) {
              // Fold total into performanceSalary (not deficitSalary) to avoid double-counting
              performanceSalary = Math.round(totalDeficit * 100) / 100;
              deficitDetails = detailParts.join(' | ');
            }
          } else {
            // Deficit already paid in previous payroll entry
          }
        }
      }
      
      // Generate deficit details for in-month deficit too
      if (deficitSalary > 0 && !deficitDetails) {
        const probationEnd = new Date(employee.probationEndDate!);
        const dayAfterProbation = probationEnd.getDate() + 1;
        const daysInMonth = workingDays;
        const dailyDiff = (confirmedPerformance - probationPerformance) / daysInMonth;
        const deficitDays = daysInMonth - dayAfterProbation + 1;
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        deficitDetails = `${monthNames[month-1]} ${year}: ${deficitDays}d × ${dailyDiff.toFixed(2)} = ${deficitSalary.toFixed(2)}`;
      }
      
      // No longer appending current month's performance to deficit details
      
      // Track current month's actual performance for EPF/ETF (excludes carry-forward deficit)
      const currentMonthPerformance = deficitDetails && deficitSalary === 0 
        ? confirmedPerformance  // Carry-forward: use only current month confirmed rate
        : performanceSalary;     // Normal or in-month deficit: use calculated performance
      
      const transportAllowance = employee.transportAllowance || 0;
      const grossSalary = basicSalary + performanceSalary + transportAllowance + deficitSalary;
      
      // Calculate attendance deduction from uploaded attendance data
      const attendance = attendanceMap.get(employee.employeeId);
      const attendedDays = attendance?.attendedDays ?? workingDays;
      const absentDays = attendance?.absentDays ?? 0;
      const unpaidLeave = attendance?.unpaidLeave ?? 0;
      const sickLeave = attendance?.sickLeave ?? 0;
      const casualLeave = attendance?.casualLeave ?? 0;
      const annualLeave = attendance?.annualLeave ?? 0;
      const otherLeave = attendance?.otherLeave ?? 0;
      const leaveNotes = attendance?.leaveNotes ?? '';
      
      // Attendance deduction: during probation ALL leaves are unpaid
      // After confirmation, only unpaid leave + absent days not covered by paid leave
      let deductibleDays: number;
      if (employee.status === 'under_probation') {
        // All leaves are unpaid during probation
        deductibleDays = absentDays;
      } else {
        const paidLeave = sickLeave + casualLeave + annualLeave;
        const effectiveUnpaidDays = Math.max(0, absentDays - paidLeave - otherLeave);
        deductibleDays = unpaidLeave > 0 ? unpaidLeave : effectiveUnpaidDays;
      }
      const perDaySalary = (basicSalary + performanceSalary + transportAllowance) / workingDays;
      const attendanceDeduction = Math.round(perDaySalary * deductibleDays * 100) / 100;
      
      const epfEmployeeRate = employee.epfEmployeeRate || taxRates.epfEmployee;
      const epfEmployerRate = employee.epfEmployerRate || taxRates.epfEmployer;
      const etfRate = employee.etfRate || taxRates.etf;
      const stampFee = taxRates.stampFee;
      
      // EPF and ETF calculated on (Basic + Current Month Performance) - excludes carry-forward deficit
      const epfEtfBase = basicSalary + currentMonthPerformance;
      const epfEmployee = Math.round((epfEtfBase * epfEmployeeRate / 100) * 100) / 100;
      const epfEmployer = Math.round((epfEtfBase * epfEmployerRate / 100) * 100) / 100;
      const etf = Math.round((epfEtfBase * etfRate / 100) * 100) / 100;
      
      // Calculate APIT based on employee's scenario
      const apitScenario = employee.apitScenario || 'employee';
      const apit = calculateAPIT(grossSalary, apitScenario);
      
      // Scenario A: Employee pays APIT - deducted from salary
      // Scenario B: Employer pays APIT - added to employer costs
      const apitDeduction = apitScenario === 'employee' ? apit : 0;
      const deductions = epfEmployee + apitDeduction + stampFee + attendanceDeduction;
      const netSalary = grossSalary - deductions;
      const apitEmployerCost = apitScenario === 'employer' ? apit : 0;
      const ctc = grossSalary + epfEmployer + etf + apitEmployerCost;
      
      previewData.push({
        employee: {
          _id: employee._id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          nickname: employee.nickname || '',
          status: employee.status,
          apitScenario: employee.apitScenario || 'employee'
        },
        basicSalary,
        performanceSalary,
        currentMonthPerformance,
        transportAllowance,
        grossSalary,
        epfEmployee,
        epfEmployer,
        etf,
        apit,
        stampFee,
        attendanceDeduction,
        attendedDays,
        absentDays,
        unpaidLeave,
        sickLeave,
        casualLeave,
        annualLeave,
        otherLeave,
        leaveNotes,
        totalDeductions: deductions,
        netSalary,
        totalCTC: ctc,
        workingDays,
        deficitSalary,
        deficitDetails,
        includeDeficitInPayroll: deficitSalary > 0
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
    
    // Get employees: active ones + closed employees whose closeDate is within the payroll month
    const genPayrollMonthStart = new Date(year, month - 1, 1);
    const genPayrollMonthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const employees = await Employee.find({ 
      _id: { $in: employeeIds },
      $or: [
        { status: { $ne: 'closed' } },
        { status: 'closed', closeDate: { $gte: genPayrollMonthStart, $lte: genPayrollMonthEnd } }
      ]
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
          cashPayment: data.cashPayment || 0,
          deficitSalary: data.deficitSalary || 0,
          includeDeficitInPayroll: data.includeDeficitInPayroll || false,
          deficitDetails: data.deficitDetails || ''
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
      const cashPayment = empData?.cashPayment || 0;
      const deficitSalary = empData?.deficitSalary || 0;
      const includeDeficitInPayroll = empData?.includeDeficitInPayroll || false;
      const deficitDetails = empData?.deficitDetails || '';
      
      // Calculate gross salary - include deficit if flag is set
      const deficitAmount = includeDeficitInPayroll ? deficitSalary : 0;
      const grossSalary = basicSalary + performanceSalary + transportAllowance + deficitAmount;
      
      // Use rates from TaxConfig, fall back to employee-specific rates if set
      const epfEmployeeRate = employee.epfEmployeeRate || taxRates.epfEmployee;
      const epfEmployerRate = employee.epfEmployerRate || taxRates.epfEmployer;
      const etfRate = employee.etfRate || taxRates.etf;
      const stampFee = taxRates.stampFee;
      
      // EPF and ETF calculated on (Basic + Current Month Performance) - excludes carry-forward deficit
      // Carry-forward: deficitDetails is set but deficitSalary is 0 (deficit folded into performanceSalary)
      const currentMonthPerformance = (deficitDetails && deficitSalary === 0) 
        ? confirmedPerformance  // Carry-forward: use only current month confirmed rate
        : performanceSalary;     // Normal or in-month deficit: use calculated performance
      const epfEtfBase = basicSalary + currentMonthPerformance;
      const epfEmployee = Math.round((epfEtfBase * epfEmployeeRate / 100) * 100) / 100;
      const epfEmployer = Math.round((epfEtfBase * epfEmployerRate / 100) * 100) / 100;
      const etf = Math.round((epfEtfBase * etfRate / 100) * 100) / 100;
      
      // Calculate APIT based on employee's scenario
      const apitScenario = employee.apitScenario || 'employee';
      const apit = calculateAPIT(grossSalary, apitScenario);
      
      // Scenario A: Employee pays APIT - deducted from salary
      // Scenario B: Employer pays APIT - added to employer costs
      const apitDeduction = apitScenario === 'employee' ? apit : 0;
      const deductions = epfEmployee + apitDeduction + stampFee + deductionAmount;
      const netSalary = grossSalary - deductions;
      const apitEmployerCost = apitScenario === 'employer' ? apit : 0;
      const ctc = grossSalary + epfEmployer + etf + apitEmployerCost;
      
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
        apitScenario,
        apitEmployer: apitEmployerCost,
        stampFee,
        deductionAmount,
        deductionReason,
        cashPayment,
        deficitSalary,
        deficitDetails,
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
      const cashPayment = entryData.cashPayment ?? payroll.cashPayment ?? 0;
      const grossSalary = basicSalary + performanceSalary + transportAllowance;
      
      const epfEmployeeRate = employee?.epfEmployeeRate || taxRates.epfEmployee;
      const epfEmployerRate = employee?.epfEmployerRate || taxRates.epfEmployer;
      const etfRate = employee?.etfRate || taxRates.etf;
      const stampFee = taxRates.stampFee;
      
      const epfEmployee = Math.round((basicSalary * epfEmployeeRate / 100) * 100) / 100;
      const epfEmployer = Math.round((basicSalary * epfEmployerRate / 100) * 100) / 100;
      const etf = Math.round((basicSalary * etfRate / 100) * 100) / 100;
      
      // APIT based on employee's scenario
      const apitScenario = employee?.apitScenario || 'employee';
      const apit = calculateAPIT(grossSalary, apitScenario);
      
      // Scenario A: Employee pays APIT, Scenario B: Employer pays
      const apitDeduction = apitScenario === 'employee' ? apit : 0;
      const deductions = epfEmployee + apitDeduction + stampFee + deductionAmount;
      const netSalary = grossSalary - deductions;
      const apitEmployerCost = apitScenario === 'employer' ? apit : 0;
      const ctc = grossSalary + epfEmployer + etf + apitEmployerCost;
      
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
        cashPayment,
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
        populate: { path: 'employee', select: 'fullName nickname employeeId status' }
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
        approvalStatus: 'approved',
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
        approvalStatus: 'approved',
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
        approvalStatus: 'approved',
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
        approvalStatus: 'approved',
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
        approvalStatus: 'approved',
        createdBy: req.user._id
      });
    }
    
    // Update bank balance - decrease only for statutory contributions (not employee net salary)
    const totalStatutoryDeduction = totalEPFEmployer + totalETF;
    if (bank.balance < totalStatutoryDeduction) {
      return res.status(400).json({ error: `Insufficient bank balance. Available: ${bank.balance.toFixed(2)}, Required: ${totalStatutoryDeduction.toFixed(2)}` });
    }
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
