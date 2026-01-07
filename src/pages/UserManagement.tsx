import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Trash2, Plus, X, Shield, Users, UserCog, ChevronDown, ChevronUp, Save, RotateCcw, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePreventSwipe } from '../hooks/usePreventSwipe';

interface User {
  _id: string;
  email: string;
  fullName?: string;
  role: 'admin' | 'accountant' | 'employee' | 'unmarked';
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

interface RolePermission {
  _id: string;
  role: string;
  permissions: string[];
}

// Predefined permission options for easy selection
const availablePermissions = {
  admin: [
    'Full system access',
    'Manage users and roles',
    'Tax configuration',
    'Employee management',
    'Payroll processing',
    'Approve transactions',
    'View audit logs',
    'System settings'
  ],
  accountant: [
    'Create and manage invoices',
    'Record and manage expenses',
    'View financial reports',
    'Manage clients and vendors',
    'View bank accounts',
    'Export reports',
    'View dashboard',
    'Payroll management (requires admin approval)'
  ],
  employee: [
    'View own payslips',
    'View personal profile',
    'Request profile updates',
    'View attendance records',
    'Download tax documents'
  ]
};

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
    role: 'accountant' as 'admin' | 'accountant' | 'employee' | 'unmarked',
    employeeRef: ''
  });
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [newPermission, setNewPermission] = useState('');

  const roleIcons: Record<string, any> = {
    admin: Shield,
    accountant: UserCog,
    employee: Users,
    unmarked: Users
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-primary/20 text-primary border-primary/30',
    accountant: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    employee: 'bg-green-500/20 text-green-600 border-green-500/30',
    unmarked: 'bg-orange-500/20 text-orange-600 border-orange-500/30'
  };

  usePreventSwipe(showModal || showRoleInfo || showPermissionModal);

  useEffect(() => {
    loadUsers();
    loadEmployees();
    loadRolePermissions();
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

  const loadRolePermissions = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/role-permissions`);
      setRolePermissions(res.data);
    } catch (error) {
      console.error('Failed to load role permissions:', error);
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

  const startEditingRole = (role: string) => {
    const rolePerm = rolePermissions.find(rp => rp.role === role);
    setEditingRole(role);
    setEditPermissions(rolePerm?.permissions || []);
    setNewPermission('');
    setShowPermissionModal(true);
  };

  const cancelEditingRole = () => {
    setEditingRole(null);
    setEditPermissions([]);
    setNewPermission('');
    setShowPermissionModal(false);
  };

  const saveRolePermissions = async () => {
    if (!editingRole) return;
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/role-permissions/${editingRole}`, {
        permissions: editPermissions
      });
      await loadRolePermissions();
      cancelEditingRole();
    } catch (error) {
      console.error('Failed to save permissions:', error);
      alert('Failed to save permissions');
    }
  };

  const togglePermission = (permission: string) => {
    if (editPermissions.includes(permission)) {
      setEditPermissions(editPermissions.filter(p => p !== permission));
    } else {
      setEditPermissions([...editPermissions, permission]);
    }
  };

  const addCustomPermission = () => {
    if (newPermission.trim() && !editPermissions.includes(newPermission.trim())) {
      setEditPermissions([...editPermissions, newPermission.trim()]);
      setNewPermission('');
    }
  };

  const removePermission = (permission: string) => {
    setEditPermissions(editPermissions.filter(p => p !== permission));
  };

  const resetAllPermissions = async () => {
    if (!confirm(t('users.confirmResetPermissions') || 'Reset all permissions to defaults?')) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/role-permissions/reset`);
      await loadRolePermissions();
      cancelEditingRole();
    } catch (error) {
      console.error('Failed to reset permissions:', error);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return t('users.admin');
      case 'accountant': return t('users.accountant');
      case 'employee': return t('users.employee');
      case 'unmarked': return t('users.unmarked') || 'Unmarked';
      default: return role;
    }
  };

  const unmarkedUsers = users.filter(u => u.role === 'unmarked');

  if (loading) return <div className="text-center py-8">{t('common.loading')}</div>;

  return (
    <div>
      {/* Unmarked Users Reminder Banner */}
      {unmarkedUsers.length > 0 && (
        <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
            <Users size={20} className="text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-orange-600">
              {t('users.unmarkedUsersReminder') || 'Action Required: Assign User Roles'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('users.unmarkedUsersMessage') || `${unmarkedUsers.length} user(s) are waiting for role assignment. Please assign roles to enable their access.`}
            </p>
          </div>
          <div className="flex-shrink-0">
            <span className="px-3 py-1 bg-orange-500/20 text-orange-600 text-sm font-medium rounded-full">
              {unmarkedUsers.length} {t('users.pending') || 'pending'}
            </span>
          </div>
        </div>
      )}

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
        <div className="mb-6">
          <div className="flex justify-end mb-3">
            <button
              onClick={resetAllPermissions}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border text-muted-foreground rounded-lg hover:bg-accent"
            >
              <RotateCcw size={16} />
              {t('users.resetToDefaults') || 'Reset to Defaults'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['admin', 'accountant', 'employee'].map((role) => {
              const Icon = roleIcons[role];
              const usersWithRole = users.filter(u => u.role === role).length;
              const rolePerm = rolePermissions.find(rp => rp.role === role);
              const permissions = rolePerm?.permissions || [];

              return (
                <div key={role} className={`p-4 rounded-lg border ${roleColors[role]}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={20} />
                    <h3 className="font-semibold">{getRoleName(role)}</h3>
                    <span className="ml-auto text-xs px-2 py-1 rounded-full bg-background/50">
                      {usersWithRole} {t('users.usersCount') || 'users'}
                    </span>
                  </div>
                  <ul className="space-y-1 text-sm mb-3">
                    {permissions.slice(0, 4).map((perm, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check size={12} className="text-current" />
                        <span className="truncate">{perm}</span>
                      </li>
                    ))}
                    {permissions.length > 4 && (
                      <li className="text-xs text-muted-foreground">
                        +{permissions.length - 4} more permissions
                      </li>
                    )}
                  </ul>
                  <button
                    onClick={() => startEditingRole(role)}
                    className="w-full px-3 py-2 text-sm border border-current/30 rounded-lg hover:bg-background/30 flex items-center justify-center gap-2 font-medium"
                  >
                    <Pencil size={14} />
                    {t('users.editPermissions') || 'Edit Permissions'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Permission Edit Modal */}
      {showPermissionModal && editingRole && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                {React.createElement(roleIcons[editingRole], { size: 24 })}
                <h2 className="text-xl font-semibold text-foreground">
                  {t('users.editPermissions') || 'Edit Permissions'} - {getRoleName(editingRole)}
                </h2>
              </div>
              <button onClick={cancelEditingRole} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>

            {/* Predefined Permissions */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {t('users.selectPermissions') || 'Select Permissions'}
              </h3>
              <div className="space-y-2">
                {availablePermissions[editingRole as keyof typeof availablePermissions]?.map((permission) => (
                  <label
                    key={permission}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={editPermissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">{permission}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Permissions */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {t('users.customPermissions') || 'Custom Permissions'}
              </h3>
              <div className="space-y-2 mb-3">
                {editPermissions
                  .filter(p => !availablePermissions[editingRole as keyof typeof availablePermissions]?.includes(p))
                  .map((permission) => (
                    <div
                      key={permission}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30"
                    >
                      <span className="text-sm text-foreground">{permission}</span>
                      <button
                        onClick={() => removePermission(permission)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPermission}
                  onChange={(e) => setNewPermission(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomPermission()}
                  placeholder={t('users.addCustomPermission') || 'Add custom permission...'}
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                />
                <button
                  onClick={addCustomPermission}
                  disabled={!newPermission.trim()}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-6 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{editPermissions.length}</span> {t('users.permissionsSelected') || 'permissions selected'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={cancelEditingRole}
                className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={saveRolePermissions}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {t('common.save')}
              </button>
            </div>
          </div>
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
                        : user.role === 'unmarked'
                        ? 'bg-orange-500/20 text-orange-600'
                        : 'bg-secondary/20 text-secondary-foreground'
                    }`}>
                      {getRoleName(user.role)}
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
              {/* Link to Employee - moved to top */}
              {formData.role === 'employee' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t('users.linkEmployee') || 'Link to Employee'}</label>
                  <select
                    value={formData.employeeRef}
                    onChange={(e) => {
                      const selectedEmpId = e.target.value;
                      const selectedEmployee = employees.find(emp => emp._id === selectedEmpId);
                      if (selectedEmployee) {
                        setFormData({ 
                          ...formData, 
                          employeeRef: selectedEmpId,
                          email: selectedEmployee.email,
                          fullName: selectedEmployee.fullName
                        });
                      } else {
                        // Clear fields when no employee selected
                        setFormData({ 
                          ...formData, 
                          employeeRef: '',
                          email: '',
                          fullName: ''
                        });
                      }
                    }}
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

              {formData.role !== 'employee' && (
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
              )}

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
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'accountant' | 'employee' | 'unmarked', employeeRef: '', email: '', fullName: '' })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="accountant">{t('users.accountant')}</option>
                  <option value="admin">{t('users.admin')}</option>
                  <option value="employee">{t('users.employee')}</option>
                  {formData.role === 'unmarked' && (
                    <option value="unmarked" disabled>{t('users.unmarked') || 'Unmarked'}</option>
                  )}
                </select>
                {formData.role === 'unmarked' && editingId && (
                  <p className="text-xs text-orange-600 mt-1">
                    {t('users.pleaseAssignRole') || 'Please assign a role to this user'}
                  </p>
                )}
              </div>

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
