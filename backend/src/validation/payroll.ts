import { z } from 'zod';

export const payrollCalculateSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  performanceSalary: z.number().min(0).optional(),
  transportAllowance: z.number().min(0).optional()
});

export const payrollCreateSchema = z.object({
  employee: z.string().min(1, 'Employee is required'),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  basicSalary: z.number().positive(),
  performanceSalary: z.number().min(0).default(0),
  transportAllowance: z.number().min(0).default(0),
  grossSalary: z.number().positive(),
  epfEmployee: z.number().min(0),
  epfEmployer: z.number().min(0),
  etf: z.number().min(0),
  apit: z.number().min(0).default(0),
  stampFee: z.number().min(0),
  totalDeductions: z.number().min(0),
  netSalary: z.number().positive(),
  totalCTC: z.number().positive(),
  workingDays: z.number().min(1).default(30),
  status: z.enum(['draft', 'approved', 'paid']).default('draft'),
  notes: z.string().optional()
});
