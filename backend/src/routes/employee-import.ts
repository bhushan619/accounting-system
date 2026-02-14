import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import Employee from '../models/Employee';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

// Use memory storage for Excel parsing (no need to persist the file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});

// Column mapping: Excel header → Employee model field
const COLUMN_MAP: Record<string, string> = {
  'employee id': 'employeeId',
  'employeeid': 'employeeId',
  'epf number': 'epfNumber',
  'epfnumber': 'epfNumber',
  'full name': 'fullName',
  'fullname': 'fullName',
  'name': 'fullName',
  'email': 'email',
  'phone': 'phone',
  'nic': 'nic',
  'address': 'address',
  'basic information': 'basicInformation',
  'basicinformation': 'basicInformation',
  'designation': 'designation',
  'department': 'department',
  'join date': 'joinDate',
  'joindate': 'joinDate',
  'basic salary': 'basicSalary',
  'basicsalary': 'basicSalary',
  'transport allowance': 'transportAllowance',
  'transportallowance': 'transportAllowance',
  'performance salary probation': 'performanceSalaryProbation',
  'performancesalaryprobation': 'performanceSalaryProbation',
  'performance salary confirmed': 'performanceSalaryConfirmed',
  'performancesalaryconfirmed': 'performanceSalaryConfirmed',
  'probation end date': 'probationEndDate',
  'probationenddate': 'probationEndDate',
  'epf employee rate': 'epfEmployeeRate',
  'epfemployeerate': 'epfEmployeeRate',
  'epf employer rate': 'epfEmployerRate',
  'epfemployerrate': 'epfEmployerRate',
  'etf rate': 'etfRate',
  'etfrate': 'etfRate',
  'apit scenario': 'apitScenario',
  'apitscenario': 'apitScenario',
  'status': 'status',
  'bank name': 'bankName',
  'bankname': 'bankName',
  'bank account number': 'bankAccountNumber',
  'bankaccountnumber': 'bankAccountNumber',
  'bank account name': 'bankAccountName',
  'bankaccountname': 'bankAccountName',
  'bank branch': 'bankBranch',
  'bankbranch': 'bankBranch',
};

// Download template
router.get('/template', (_req, res) => {
  const headers = [
    'Employee ID', 'EPF Number', 'Full Name', 'Email', 'Phone', 'NIC', 'Address',
    'Basic Information', 'Designation', 'Department', 'Join Date', 'Basic Salary',
    'Transport Allowance', 'Performance Salary Probation', 'Performance Salary Confirmed',
    'Probation End Date', 'EPF Employee Rate', 'EPF Employer Rate', 'ETF Rate',
    'APIT Scenario', 'Status', 'Bank Name', 'Bank Account Number', 'Bank Account Name', 'Bank Branch'
  ];

  const sampleRow: Record<string, any> = {
    'Employee ID': 'EMP001',
    'EPF Number': 'EPF001',
    'Full Name': 'John Doe',
    'Email': 'john@example.com',
    'Phone': '0771234567',
    'NIC': '200012345678',
    'Address': '123 Main St, Colombo',
    'Basic Information': '',
    'Designation': 'Software Engineer',
    'Department': 'R&D department',
    'Join Date': '2025-01-15',
    'Basic Salary': 100000,
    'Transport Allowance': 5000,
    'Performance Salary Probation': 10000,
    'Performance Salary Confirmed': 20000,
    'Probation End Date': '2025-07-15',
    'EPF Employee Rate': 8,
    'EPF Employer Rate': 12,
    'ETF Rate': 3,
    'APIT Scenario': 'employee',
    'Status': 'under_probation',
    'Bank Name': 'Commercial Bank',
    'Bank Account Number': '1234567890',
    'Bank Account Name': 'John Doe',
    'Bank Branch': 'Colombo'
  };

  const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=employee-import-template.xlsx');
  res.send(buf);
});

// Import employees
router.post('/import', upload.single('file'), auditLog('import', 'employee'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    if (rawRows.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rowNum = i + 2; // Excel row (header is row 1)

      // Map columns
      const mapped: Record<string, any> = {};
      for (const [key, value] of Object.entries(raw)) {
        const normalizedKey = key.trim().toLowerCase();
        const field = COLUMN_MAP[normalizedKey];
        if (field) {
          mapped[field] = value;
        }
      }

      // Validate required fields
      if (!mapped.employeeId || !mapped.fullName || !mapped.email || !mapped.basicSalary) {
        results.errors.push(`Row ${rowNum}: Missing required fields (Employee ID, Full Name, Email, or Basic Salary)`);
        results.skipped++;
        continue;
      }

      // Check for duplicate employeeId
      const existing = await Employee.findOne({ employeeId: mapped.employeeId });
      if (existing) {
        results.errors.push(`Row ${rowNum}: Employee ID "${mapped.employeeId}" already exists`);
        results.skipped++;
        continue;
      }

      // Parse numeric fields
      mapped.basicSalary = Number(mapped.basicSalary) || 0;
      mapped.transportAllowance = Number(mapped.transportAllowance) || 0;
      mapped.performanceSalaryProbation = Number(mapped.performanceSalaryProbation) || 0;
      mapped.performanceSalaryConfirmed = Number(mapped.performanceSalaryConfirmed) || 0;
      mapped.epfEmployeeRate = Number(mapped.epfEmployeeRate) || 8;
      mapped.epfEmployerRate = Number(mapped.epfEmployerRate) || 12;
      mapped.etfRate = Number(mapped.etfRate) || 3;
      mapped.workingDaysPerMonth = 30;

      // Parse dates
      if (mapped.joinDate) {
        const d = parseExcelDate(mapped.joinDate);
        mapped.joinDate = d || new Date();
      }
      if (mapped.probationEndDate) {
        const d = parseExcelDate(mapped.probationEndDate);
        if (d) mapped.probationEndDate = d;
        else delete mapped.probationEndDate;
      }

      // Validate enums
      if (mapped.department && !['HR department', 'R&D department', ''].includes(mapped.department)) {
        mapped.department = '';
      }
      if (mapped.apitScenario && !['employee', 'employer'].includes(mapped.apitScenario)) {
        mapped.apitScenario = 'employee';
      }
      if (mapped.status && !['under_probation', 'confirmed', 'closed'].includes(mapped.status)) {
        mapped.status = 'under_probation';
      }

      try {
        await Employee.create(mapped);
        results.created++;
      } catch (err: any) {
        results.errors.push(`Row ${rowNum}: ${err.message}`);
        results.skipped++;
      }
    }

    res.json(results);
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to parse Excel file: ' + err.message });
  }
});

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  // Excel serial number
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date;
}

export default router;
