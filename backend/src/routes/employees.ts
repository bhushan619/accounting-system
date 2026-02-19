import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import Employee from '../models/Employee';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

// ── Excel template download (must be before /:id) ──
router.get('/template', (_req, res) => {
  const headers = [
    'Employee ID', 'EPF Number', 'Full Name', 'Nickname', 'Email', 'Phone', 'NIC', 'Address',
    'Basic Information', 'Designation', 'Department', 'Join Date', 'Basic Salary',
    'Transport Allowance', 'Performance Salary Probation', 'Performance Salary Confirmed',
    'Probation End Date', 'EPF Employee Rate', 'EPF Employer Rate', 'ETF Rate',
    'APIT Scenario', 'Status', 'Bank Name', 'Bank Account Number', 'Bank Account Name', 'Bank Branch'
  ];
  const sampleRow: Record<string, any> = {
    'Employee ID': 'EMP001', 'EPF Number': 'EPF001', 'Full Name': 'John Doe',
    'Nickname': 'Johnny', 'Email': 'john@example.com', 'Phone': '0771234567', 'NIC': '200012345678',
    'Address': '123 Main St, Colombo', 'Basic Information': '', 'Designation': 'Software Engineer',
    'Department': 'R&D department', 'Join Date': '2025-01-15', 'Basic Salary': 100000,
    'Transport Allowance': 5000, 'Performance Salary Probation': 10000,
    'Performance Salary Confirmed': 20000, 'Probation End Date': '2025-07-15',
    'EPF Employee Rate': 8, 'EPF Employer Rate': 12, 'ETF Rate': 3,
    'APIT Scenario': 'Employee', 'Status': 'Under Probation', 'Bank Name': 'Commercial Bank',
    'Bank Account Number': '1234567890', 'Bank Account Name': 'John Doe', 'Bank Branch': 'Colombo'
  };
  const notesRow: Record<string, any> = {
    'Employee ID': '* Required, Unique', 'EPF Number': 'Optional', 'Full Name': '* Required',
    'Nickname': 'Optional', 'Email': '* Required', 'Phone': 'Optional', 'NIC': 'Optional',
    'Address': 'Optional', 'Basic Information': 'Optional', 'Designation': 'Optional',
    'Department': 'HR department / R&D department', 'Join Date': 'YYYY-MM-DD', 'Basic Salary': '* Required, Number',
    'Transport Allowance': 'Number, Default: 0', 'Performance Salary Probation': 'Number, Default: 0',
    'Performance Salary Confirmed': 'Number, Default: 0', 'Probation End Date': 'YYYY-MM-DD',
    'EPF Employee Rate': 'Number, Default: 8', 'EPF Employer Rate': 'Number, Default: 12', 'ETF Rate': 'Number, Default: 3',
    'APIT Scenario': 'Employee / Employer', 'Status': 'Under Probation / Confirmed / Closed',
    'Bank Name': 'Optional', 'Bank Account Number': 'Optional', 'Bank Account Name': 'Optional', 'Bank Branch': 'Optional'
  };
  const ws = XLSX.utils.json_to_sheet([notesRow, sampleRow], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=employee-import-template.xlsx');
  res.send(buf);
});

// ── Excel import ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls|csv)$/i)) cb(null, true);
    else cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
  }
});

const COLUMN_MAP: Record<string, string> = {
  'employee id': 'employeeId', 'employeeid': 'employeeId', 'epf number': 'epfNumber',
  'epfnumber': 'epfNumber', 'full name': 'fullName', 'fullname': 'fullName', 'name': 'fullName',
  'nickname': 'nickname',
  'email': 'email', 'phone': 'phone', 'nic': 'nic', 'address': 'address',
  'basic information': 'basicInformation', 'basicinformation': 'basicInformation',
  'designation': 'designation', 'department': 'department', 'join date': 'joinDate',
  'joindate': 'joinDate', 'basic salary': 'basicSalary', 'basicsalary': 'basicSalary',
  'transport allowance': 'transportAllowance', 'transportallowance': 'transportAllowance',
  'performance salary probation': 'performanceSalaryProbation',
  'performancesalaryprobation': 'performanceSalaryProbation',
  'performance salary confirmed': 'performanceSalaryConfirmed',
  'performancesalaryconfirmed': 'performanceSalaryConfirmed',
  'probation end date': 'probationEndDate', 'probationenddate': 'probationEndDate',
  'epf employee rate': 'epfEmployeeRate', 'epfemployeerate': 'epfEmployeeRate',
  'epf employer rate': 'epfEmployerRate', 'epfemployerrate': 'epfEmployerRate',
  'etf rate': 'etfRate', 'etfrate': 'etfRate', 'apit scenario': 'apitScenario',
  'apitscenario': 'apitScenario', 'status': 'status', 'bank name': 'bankName',
  'bankname': 'bankName', 'bank account number': 'bankAccountNumber',
  'bankaccountnumber': 'bankAccountNumber', 'bank account name': 'bankAccountName',
  'bankaccountname': 'bankAccountName', 'bank branch': 'bankBranch', 'bankbranch': 'bankBranch',
};

const VALID_COLUMNS = new Set(Object.keys(COLUMN_MAP));

// Map human-readable values to internal enum values
const STATUS_MAP: Record<string, string> = {
  'under probation': 'under_probation', 'under_probation': 'under_probation',
  'confirmed': 'confirmed', 'closed': 'closed',
};
const APIT_MAP: Record<string, string> = {
  'employee': 'employee', 'employer': 'employer',
};
const DEPARTMENT_MAP: Record<string, string> = {
  'hr department': 'HR department', 'r&d department': 'R&D department',
  'hr': 'HR department', 'r&d': 'R&D department', '': '',
};

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date;
}

router.post('/import', upload.single('file'), auditLog('import', 'employee'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    if (rawRows.length === 0) return res.status(400).json({ error: 'Excel file is empty' });

    // Skip unrecognized columns silently — allows rearranged or extra columns

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rowNum = i + 2;
      const mapped: Record<string, any> = {};
      for (const [key, value] of Object.entries(raw)) {
        const field = COLUMN_MAP[key.trim().toLowerCase()];
        if (field) mapped[field] = value;
      }
      if (!mapped.employeeId || !mapped.fullName || !mapped.email || !mapped.basicSalary) {
        results.errors.push(`Row ${rowNum}: Missing required fields (Employee ID, Full Name, Email, Basic Salary)`); results.skipped++; continue;
      }
      if (await Employee.findOne({ employeeId: mapped.employeeId })) {
        results.errors.push(`Row ${rowNum}: Employee ID "${mapped.employeeId}" already exists`); results.skipped++; continue;
      }
      if (await Employee.findOne({ email: mapped.email })) {
        results.errors.push(`Row ${rowNum}: Email "${mapped.email}" already exists`); results.skipped++; continue;
      }
      mapped.basicSalary = Number(mapped.basicSalary) || 0;
      mapped.transportAllowance = Number(mapped.transportAllowance) || 0;
      mapped.performanceSalaryProbation = Number(mapped.performanceSalaryProbation) || 0;
      mapped.performanceSalaryConfirmed = Number(mapped.performanceSalaryConfirmed) || 0;
      mapped.epfEmployeeRate = Number(mapped.epfEmployeeRate) || 8;
      mapped.epfEmployerRate = Number(mapped.epfEmployerRate) || 12;
      mapped.etfRate = Number(mapped.etfRate) || 3;
      mapped.workingDaysPerMonth = 30;
      if (mapped.joinDate) { mapped.joinDate = parseExcelDate(mapped.joinDate) || new Date(); }
      if (mapped.probationEndDate) { const d = parseExcelDate(mapped.probationEndDate); if (d) mapped.probationEndDate = d; else delete mapped.probationEndDate; }
      // Map human-readable enum values
      if (mapped.department) {
        const deptKey = mapped.department.toString().trim().toLowerCase();
        if (deptKey in DEPARTMENT_MAP) { mapped.department = DEPARTMENT_MAP[deptKey]; }
        else { results.errors.push(`Row ${rowNum}: Invalid Department "${mapped.department}". Use "HR department" or "R&D department"`); results.skipped++; continue; }
      }
      if (mapped.apitScenario) {
        const apitKey = mapped.apitScenario.toString().trim().toLowerCase();
        if (apitKey in APIT_MAP) { mapped.apitScenario = APIT_MAP[apitKey]; }
        else { results.errors.push(`Row ${rowNum}: Invalid APIT Scenario "${mapped.apitScenario}". Use "Employee" or "Employer"`); results.skipped++; continue; }
      }
      if (mapped.status) {
        const statusKey = mapped.status.toString().trim().toLowerCase();
        if (statusKey in STATUS_MAP) { mapped.status = STATUS_MAP[statusKey]; }
        else { results.errors.push(`Row ${rowNum}: Invalid Status "${mapped.status}". Use "Under Probation", "Confirmed", or "Closed"`); results.skipped++; continue; }
      }
      try { await Employee.create(mapped); results.created++; } catch (err: any) { results.errors.push(`Row ${rowNum}: ${err.message}`); results.skipped++; }
    }
    res.json(results);
  } catch (err: any) { res.status(400).json({ error: 'Failed to parse Excel file: ' + err.message }); }
});

// Removed auto-update logic - status is now manually controlled via dropdown

router.get('/', async (req, res) => {
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
  
  // Get the current employee to check if status is changing
  const currentEmployee = await Employee.findById(req.params.id);
  if (!currentEmployee) return res.status(404).json({ error: 'Not found' });
  
  // Track status update date when changing from under_probation to confirmed
  if (currentEmployee.status === 'under_probation' && data.status === 'confirmed') {
    data.statusUpdateDate = new Date();
  }
  
  const employee = await Employee.findByIdAndUpdate(
    req.params.id,
    data,
    { new: true }
  );
  if (!employee) return res.status(404).json({ error: 'Not found' });
  res.json(employee);
});

// ── Bulk delete ──
router.post('/bulk-delete', auditLog('bulk-delete', 'employee'), async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No IDs provided' });
  const result = await Employee.deleteMany({ _id: { $in: ids } });
  res.json({ deleted: result.deletedCount });
});

router.delete('/:id', auditLog('delete', 'employee'), async (req, res) => {
  const employee = await Employee.findByIdAndDelete(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
