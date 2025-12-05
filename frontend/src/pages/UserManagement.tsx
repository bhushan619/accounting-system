import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Trash2, Plus, X, Shield, Users, UserCog, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface User {
  _id: string;
  email: string;
  fullName?: string;
  role: 'admin' | 'accountant' | 'employee';
  employeeRef?: string;
  createdAt: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  fullName: string;
  email: string;
  userAccount?: string;
}

export default function UserManagement() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'accountant' as 'admin' | 'accountant' | 'employee',
    employeeRef: ''
  });
  const [showRoleInfo, setShowRoleInfo] = useState(false);

  useEffect(() => {
    loadUsers();
    loadEmployees();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/users`);
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/employees`);
      setEmployees(res.data);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/users/${editingId}`, formData);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/users`, formData);
      }
      loadUsers();
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user._id);
    setFormData({
      email: user.email,
      password: '',
      fullName: user.fullName || '',
      role: user.role,
      employeeRef: user.employeeRef || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/users/${id}`);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      fullName: '',
      role: 'accountant',
      employeeRef: ''
    });
    setEditingId(null);
    setShowModal(false);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const rolePermissions = {
    admin: {
      name: t('users.admin'),
      icon: Shield,
      color: 'bg-primary/20 text-primary border-primary/30',
      permissions: [
        t('users.rolePermissions.fullAccess') || 'Full system access',
        t('users.rolePermissions.manageUsers') || 'Manage users and roles',
        t('users.rolePermissions.taxConfig') || 'Tax configuration',
        t('users.rolePermissions.employees') || 'Employee management',
        t('users.rolePermissions.payroll') || 'Payroll processing',
        t('users.rolePermissions.approvals') || 'Approve transactions',
      ]
    },
    accountant: {
      name: t('users.accountant'),
      icon: UserCog,
      color: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
      permissions: [
        t('users.rolePermissions.invoices') || 'Create and manage invoices',
        t('users.rolePermissions.expenses') || 'Record and manage expenses',
        t('users.rolePermissions.reports') || 'View financial reports',
        t('users.rolePermissions.clients') || 'Manage clients and vendors',
        t('users.rolePermissions.banks') || 'View bank accounts',
      ]
    },
    employee: {
      name: t('users.employee'),
      icon: Users,
      color: 'bg-green-500/20 text-green-600 border-green-500/30',
      permissions: [
        t('users.rolePermissions.viewPayslips') || 'View own payslips',
        t('users.rolePermissions.viewProfile') || 'View personal profile',
        t('users.rolePermissions.requestUpdates') || 'Request profile updates',
      ]
    }
  };

  if (loading) return <div className="text-center py-8">{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t('users.title')}</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRoleInfo(!showRoleInfo)}
            className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
          >
            <Shield size={20} />
            {t('users.rolePermissionsTitle') || 'Role Permissions'}
            {showRoleInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus size={20} />
            {t('users.addUser')}
          </button>
        </div>
      </div>

      {/* Role Permissions Overview */}
      {showRoleInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(rolePermissions).map(([role, info]) => {
            const Icon = info.icon;
            const usersWithRole = users.filter(u => u.role === role).length;
            return (
              <div key={role} className={`p-4 rounded-lg border ${info.color}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={20} />
                  <h3 className="font-semibold">{info.name}</h3>
                  <span className="ml-auto text-xs px-2 py-1 rounded-full bg-background/50">
                    {usersWithRole} {t('users.usersCount') || 'users'}
                  </span>
                </div>
                <ul className="space-y-1 text-sm">
                  {info.permissions.map((perm, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-card rounded-lg shadow overflow-hidden">
        <table className="w-full">
        <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('common.email')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('users.fullName')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('users.role')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('users.linkedEmployee')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('common.date')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => {
              const linkedEmployee = user.employeeRef ? employees.find(e => e._id === user.employeeRef) : null;
              return (
                <tr key={user._id} className="hover:bg-accent/50">
                  <td className="px-6 py-4 text-sm text-foreground">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{user.fullName || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-primary/20 text-primary' 
                        : user.role === 'employee'
                        ? 'bg-green-500/20 text-green-600'
                        : 'bg-secondary/20 text-secondary-foreground'
                    }`}>
                      {user.role === 'admin' ? t('users.admin') : user.role === 'employee' ? t('users.employee') : t('users.accountant')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {linkedEmployee ? `${linkedEmployee.employeeId} - ${linkedEmployee.fullName}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-primary hover:text-primary/80 mr-3"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(user._id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                {editingId ? t('users.editUser') : t('users.addUser')}
              </h2>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('common.email')}</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('login.password')} {editingId && `(${t('users.passwordHint') || 'leave blank to keep current'})`}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('users.fullName')}</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('users.role')}</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'accountant' | 'employee', employeeRef: '' })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="accountant">{t('users.accountant')}</option>
                  <option value="admin">{t('users.admin')}</option>
                  <option value="employee">{t('users.employee')}</option>
                </select>
              </div>

              {formData.role === 'employee' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t('users.linkEmployee') || 'Link to Employee'}</label>
                  <select
                    value={formData.employeeRef}
                    onChange={(e) => setFormData({ ...formData, employeeRef: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  >
                    <option value="">{t('common.select') || 'Select Employee'}</option>
                    {employees
                      .filter(emp => !emp.userAccount || emp._id === formData.employeeRef)
                      .map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.employeeId} - {emp.fullName}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('users.linkEmployeeHint') || 'Only employees without linked accounts are shown'}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  {editingId ? t('common.save') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
