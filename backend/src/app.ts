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
import usersRoutes from './routes/users';
import taxconfigRoutes from './routes/taxconfig';
import taxconfigSeedRouter from './routes/taxconfig-seed';
import reportsRoutes from './routes/reports';
import exportsRoutes from './routes/exports';
import auditlogsRoutes from './routes/auditlogs';
import uploadsRoutes from './routes/uploads';
import swaggerRoutes from './routes/swagger';
import config from './config';

const app = express();

app.use(cors({ origin: true, credentials: true }));
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
app.use('/users', usersRoutes);
app.use('/taxconfig', taxconfigRoutes);
app.use('/taxconfig', taxconfigSeedRouter);
app.use('/reports', reportsRoutes);
app.use('/exports', exportsRoutes);
app.use('/auditlogs', auditlogsRoutes);
app.use('/uploads', uploadsRoutes);
app.use('/docs', swaggerRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), config.UPLOADS_DIR)));

app.use((err:any, req:any, res:any, next:any)=> { 
  console.error(err); 
  res.status(500).json({ error: err.message }); 
});

export default app;
