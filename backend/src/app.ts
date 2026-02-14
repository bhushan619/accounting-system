import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import 'express-async-errors';
import authRoutes from './routes/auth';
import clientsRoutes from './routes/clients';
import invoicesRoutes from './routes/invoices';
import expensesRoutes from './routes/expenses';
import vendorsRoutes from './routes/vendors';
import banksRoutes from './routes/banks';
import employeesRoutes from './routes/employees';
import payrollRoutes from './routes/payroll';
import payrollrunsRoutes from './routes/payrollruns';
import attendanceRoutes from './routes/attendance';
import usersRoutes from './routes/users';
import taxconfigRoutes from './routes/taxconfig';
import taxconfigSeedRouter from './routes/taxconfig-seed';
import reportsRoutes from './routes/reports';
import exportsRoutes from './routes/exports';
import auditlogsRoutes from './routes/auditlogs';
import uploadsRoutes from './routes/uploads';
import swaggerRoutes from './routes/swagger';
import approvalRoutes from './routes/approval';
import employeePortalRoutes from './routes/employee-portal';
import vatReportsRoutes from './routes/vat-reports';
import rolePermissionsRoutes from './routes/role-permissions';
import settingsRoutes from './routes/settings';
import employeeImportRoutes from './routes/employee-import';
import config from './config';

const app = express();

// Configure CORS with allowed origins whitelist
app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (config.ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400 // Cache preflight for 24 hours
}));
app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/clients', clientsRoutes);
app.use('/invoices', invoicesRoutes);
app.use('/expenses', expensesRoutes);
app.use('/vendors', vendorsRoutes);
app.use('/banks', banksRoutes);
app.use('/employees', employeesRoutes);
app.use('/payroll', payrollRoutes);
app.use('/payrollruns', payrollrunsRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/users', usersRoutes);
app.use('/taxconfig', taxconfigRoutes);
app.use('/taxconfig', taxconfigSeedRouter);
app.use('/reports', reportsRoutes);
app.use('/exports', exportsRoutes);
app.use('/auditlogs', auditlogsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/docs', swaggerRoutes);
app.use('/approval', approvalRoutes);
app.use('/employee-portal', employeePortalRoutes);
app.use('/vat-reports', vatReportsRoutes);
app.use('/role-permissions', rolePermissionsRoutes);
app.use('/settings', settingsRoutes);
app.use('/employees', employeeImportRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), config.UPLOADS_DIR)));

app.use((err:any, req:any, res:any, next:any)=> { 
  console.error(err); 
  res.status(500).json({ error: err.message }); 
});

export default app;
