import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';
import Vendors from './pages/Vendors';
import Banks from './pages/Banks';
import Employees from './pages/Employees';
import Payroll from './pages/Payroll';
import UserManagement from './pages/UserManagement';
import EnhancedReports from './pages/EnhancedReports';
import Settings from './pages/Settings';
import Guide from './pages/Guide';
import TaxConfigurations from './pages/TaxConfigurations';
import Transactions from './pages/Transactions';
import TaxReports from './pages/TaxReports';
import TranslationManagement from './pages/TranslationManagement';
import EmployeeLogin from './pages/EmployeeLogin';
import EmployeePortal from './pages/EmployeePortal';
import Approvals from './pages/Approvals';
import VATReports from './pages/VATReports';
import './styles.css';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect employees to employee portal if they try to access admin/accountant pages
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'employee') {
      return <Navigate to="/employee-portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Layout>{children}</Layout>;
}

function DefaultRedirect() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Redirect based on role
  if (user?.role === 'employee') {
    return <Navigate to="/employee-portal" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/employee-login" element={<EmployeeLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/employee-portal" element={<ProtectedRoute allowedRoles={['employee']}><EmployeePortal /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Dashboard /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Clients /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Invoices /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Expenses /></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Vendors /></ProtectedRoute>} />
            <Route path="/banks" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Banks /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute allowedRoles={['admin']}><Employees /></ProtectedRoute>} />
            <Route path="/payroll" element={<ProtectedRoute allowedRoles={['admin']}><Payroll /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><EnhancedReports /></ProtectedRoute>} />
            <Route path="/tax-reports" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><TaxReports /></ProtectedRoute>} />
            <Route path="/vat-reports" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><VATReports /></ProtectedRoute>} />
            <Route path="/tax-configurations" element={<ProtectedRoute allowedRoles={['admin']}><TaxConfigurations /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Transactions /></ProtectedRoute>} />
            <Route path="/translations" element={<ProtectedRoute allowedRoles={['admin']}><TranslationManagement /></ProtectedRoute>} />
            <Route path="/approvals" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Approvals /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/guide" element={<ProtectedRoute><Guide /></ProtectedRoute>} />
            <Route path="/" element={<DefaultRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
