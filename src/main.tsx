import React, { Suspense, lazy, memo } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import './styles.css';

// Lazy-load all pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Vendors = lazy(() => import('./pages/Vendors'));
const Banks = lazy(() => import('./pages/Banks'));
const Employees = lazy(() => import('./pages/Employees'));
const Payroll = lazy(() => import('./pages/Payroll'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const EnhancedReports = lazy(() => import('./pages/EnhancedReports'));
const Settings = lazy(() => import('./pages/Settings'));
const Guide = lazy(() => import('./pages/Guide'));
const TaxConfigurations = lazy(() => import('./pages/TaxConfigurations'));
const Transactions = lazy(() => import('./pages/Transactions'));
const TaxReports = lazy(() => import('./pages/TaxReports'));
const TranslationManagement = lazy(() => import('./pages/TranslationManagement'));
const EmployeeLogin = lazy(() => import('./pages/EmployeeLogin'));
const EmployeePortal = lazy(() => import('./pages/EmployeePortal'));
const Approvals = lazy(() => import('./pages/Approvals'));
const VATReports = lazy(() => import('./pages/VATReports'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));

// Shared spinner used during lazy-load and auth checks
const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
  </div>
);

const ProtectedRoute = memo(function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, token, loading } = useAuth();

  if (loading) return <PageSpinner />;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role === 'unmarked') return <Navigate to="/pending-approval" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'employee' ? '/employee-portal' : '/dashboard'} replace />;
  }

  return <Layout>{children}</Layout>;
});

const DefaultRedirect = memo(function DefaultRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <PageSpinner />;
  if (user?.role === 'unmarked') return <Navigate to="/pending-approval" replace />;
  if (user?.role === 'employee') return <Navigate to="/employee-portal" replace />;
  return <Navigate to="/dashboard" replace />;
});

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/employee-login" element={<EmployeeLogin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pending-approval" element={<PendingApproval />} />

              {/* Employee portal */}
              <Route path="/employee-portal" element={<ProtectedRoute allowedRoles={['employee']}><EmployeePortal /></ProtectedRoute>} />

              {/* Admin + Accountant routes */}
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Dashboard /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Clients /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Invoices /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Expenses /></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Vendors /></ProtectedRoute>} />
              <Route path="/banks" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Banks /></ProtectedRoute>} />
              <Route path="/payroll" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Payroll /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><EnhancedReports /></ProtectedRoute>} />
              <Route path="/tax-reports" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><TaxReports /></ProtectedRoute>} />
              <Route path="/vat-reports" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><VATReports /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Transactions /></ProtectedRoute>} />

              {/* Admin-only routes */}
              <Route path="/employees" element={<ProtectedRoute allowedRoles={['admin']}><Employees /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
              <Route path="/tax-configurations" element={<ProtectedRoute allowedRoles={['admin']}><TaxConfigurations /></ProtectedRoute>} />
              <Route path="/translations" element={<ProtectedRoute allowedRoles={['admin']}><TranslationManagement /></ProtectedRoute>} />
              <Route path="/approvals" element={<ProtectedRoute allowedRoles={['admin']}><Approvals /></ProtectedRoute>} />

              {/* Shared protected routes */}
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/guide" element={<ProtectedRoute><Guide /></ProtectedRoute>} />

              <Route path="/" element={<DefaultRedirect />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
