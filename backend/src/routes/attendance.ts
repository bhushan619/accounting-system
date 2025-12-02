import express from 'express';
import Attendance from '../models/Attendance';
import Employee from '../models/Employee';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

// Get all attendance records
router.get('/', async (req, res) => {
  const { month, year } = req.query;
  
  const filter: any = {};
  if (month) filter.month = parseInt(month as string);
  if (year) filter.year = parseInt(year as string);
  
  const records = await Attendance.find(filter)
    .populate('employee', 'employeeId fullName')
    .populate('payrollRun', 'runNumber')
    .sort({ year: -1, month: -1 })
    .lean();
  res.json(records);
});

// Get attendance for a specific month/year
router.get('/month/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  
  const records = await Attendance.find({
    month: parseInt(month),
    year: parseInt(year)
  })
    .populate('employee', 'employeeId fullName basicSalary')
    .lean();
  
  res.json(records);
});

// Get attendance for a specific employee
router.get('/employee/:employeeId', async (req, res) => {
  const employee = await Employee.findOne({ employeeId: req.params.employeeId });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  
  const records = await Attendance.find({ employee: employee._id })
    .sort({ year: -1, month: -1 })
    .lean();
  res.json(records);
});

// Bulk save attendance records (used during payroll generation)
router.post('/bulk', auditLog('create', 'attendance'), async (req: any, res) => {
  try {
    const { month, year, attendanceData, payrollRunId } = req.body;
    
    const savedRecords = [];
    
    for (const data of attendanceData) {
      const employee = await Employee.findOne({ employeeId: data.employeeId });
      if (!employee) continue;
      
      // Upsert: update if exists, create if not
      const record = await Attendance.findOneAndUpdate(
        { employee: employee._id, month, year },
        {
          workingDays: data.workingDays,
          attendedDays: data.attendedDays,
          absentDays: data.absentDays,
          sickLeave: data.sickLeave || 0,
          casualLeave: data.casualLeave || 0,
          annualLeave: data.annualLeave || 0,
          unpaidLeave: data.unpaidLeave || 0,
          otherLeave: data.otherLeave || 0,
          leaveNotes: data.leaveNotes || '',
          attendanceDeduction: data.attendanceDeduction || 0,
          payrollRun: payrollRunId,
          createdBy: req.user._id,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      savedRecords.push(record);
    }
    
    res.json({ saved: savedRecords.length, records: savedRecords });
  } catch (error) {
    console.error('Bulk save attendance error:', error);
    res.status(500).json({ error: 'Failed to save attendance records' });
  }
});

// Delete attendance record
router.delete('/:id', auditLog('delete', 'attendance'), async (req, res) => {
  const record = await Attendance.findByIdAndDelete(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
