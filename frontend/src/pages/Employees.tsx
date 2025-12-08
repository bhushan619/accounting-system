import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, UserCog, Mail, Phone, Link } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Employee {
  _id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  basicSalary: number;
  status: string;
  userAccount?: string;
}

interface User {
  _id: string;
  email: string;
  role: string;
  fullName?: string;
}

interface TaxConfig {
  _id: string;
  name: string;
  taxType: string;
  rate?: number;
  isActive: boolean;
}

export default function Employees() {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [taxConfigs, setTaxConfigs] = useState<TaxConfig[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    phone: '',
    nic: '',
    address: '',
    designation: '',
    department: '',
    joinDate: new Date().toISOString().split('T')[0],
    basicSalary: 0,
    allowances: 0,
    epfEmployeeRate: 8,
    epfEmployerRate: 12,
    etfRate: 3,
    apitScenario: 'employee' as 'employee' | 'employer',
    status: 'active',
    userAccount: ''
  });

  const [calculations, setCalculations] = useState({
    grossSalary: 0,
    epfEmployee: 0,
    epfEmployer: 0,
    etf: 0,
    apit: 0,
    stampFee: 25,
    netSalary: 0,
    totalCTC: 0
  });

  useEffect(() => {
    loadEmployees();
    loadTaxConfigs();
    loadAvailableUsers();
  }, []);

  const loadAvailableUsers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/users`);
      // Filter to only users with unmarked role
      const users = response.data.filter((u: User) => u.role === 'unmarked');
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadTaxConfigs = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/taxconfig`);
      const configs = response.data.filter((c: TaxConfig) => c.isActive);
      setTaxConfigs(configs);
      
      // Auto-populate rates from tax configs
      const epfEmployee = configs.find((c: TaxConfig) => c.taxType === 'epf_employee')?.rate || 8;
      const epfEmployer = configs.find((c: TaxConfig) => c.taxType === 'epf_employer')?.rate || 12;
      const etf = configs.find((c: TaxConfig) => c.taxType === 'etf')?.rate || 3;
      
      setFormData(prev => ({
        ...prev,
        epfEmployeeRate: epfEmployee,
        epfEmployerRate: epfEmployer,
        etfRate: etf
      }));
    } catch (error) {
      console.error('Failed to load tax configurations:', error);
    }
  };

  // Calculate APIT based on slab system with standard deductions
  const calculateAPIT = (grossSalary: number, scenario: 'employee' | 'employer'): number => {
    // Scenario A: APIT Paid by Employee (Standard)
    const employeeSlabs = [
      { minIncome: 0, maxIncome: 150000, rate: 0, standardDeduction: 0 },
      { minIncome: 150001, maxIncome: 233333, rate: 6, standardDeduction: 9000 },
      { minIncome: 233334, maxIncome: 275000, rate: 18, standardDeduction: 37000 },
      { minIncome: 275001, maxIncome: 316667, rate: 24, standardDeduction: 53500 },
      { minIncome: 316668, maxIncome: 358333, rate: 30, standardDeduction: 72500 },
      { minIncome: 358334, maxIncome: null, rate: 36, standardDeduction: 94000 }
    ];

    // Scenario B: APIT Paid by Employer
    const employerSlabs = [
      { minIncome: 0, maxIncome: 150000, rate: 0, standardDeduction: 0 },
      { minIncome: 150001, maxIncome: 228333, rate: 6.38, standardDeduction: 9570 },
      { minIncome: 228334, maxIncome: 262500, rate: 21.95, standardDeduction: 45119 },
      { minIncome: 262501, maxIncome: 294167, rate: 31.58, standardDeduction: 70398 },
      { minIncome: 294168, maxIncome: 323333, rate: 42.86, standardDeduction: 103580 },
      { minIncome: 323334, maxIncome: null, rate: 56.25, standardDeduction: 146875 }
    ];

    const slabs = scenario === 'employee' ? employeeSlabs : employerSlabs;

    // Find applicable slab
    let applicableSlab = slabs[0];
    for (const slab of slabs) {
      if (grossSalary >= slab.minIncome) {
        if (slab.maxIncome === null || grossSalary <= slab.maxIncome) {
          applicableSlab = slab;
          break;
        }
      }
    }

    // APIT = (Gross Salary × Tax Rate) - Standard Deduction
    const apit = (grossSalary * applicableSlab.rate / 100) - applicableSlab.standardDeduction;
    
    return Math.max(0, Math.round(apit * 100) / 100);
  };

  // Recalculate whenever salary or rates change
  useEffect(() => {
    const grossSalary = formData.basicSalary + formData.allowances;
    const epfEmployee = (formData.basicSalary * formData.epfEmployeeRate) / 100;
    const epfEmployer = (formData.basicSalary * formData.epfEmployerRate) / 100;
    const etf = (formData.basicSalary * formData.etfRate) / 100;
    const apit = calculateAPIT(grossSalary, formData.apitScenario);
    const stampFee = 25;

    let netSalary = 0;
    let totalCTC = 0;

    if (formData.apitScenario === 'employee') {
      netSalary = grossSalary - epfEmployee - apit - stampFee;
      totalCTC = grossSalary + epfEmployer + etf;
    } else {
      netSalary = grossSalary - epfEmployee - stampFee;
      totalCTC = grossSalary + epfEmployer + etf + apit;
    }

    setCalculations({
      grossSalary: Math.round(grossSalary * 100) / 100,
      epfEmployee: Math.round(epfEmployee * 100) / 100,
      epfEmployer: Math.round(epfEmployer * 100) / 100,
      etf: Math.round(etf * 100) / 100,
      apit: Math.round(apit * 100) / 100,
      stampFee,
      netSalary: Math.round(netSalary * 100) / 100,
      totalCTC: Math.round(totalCTC * 100) / 100
    });
  }, [formData.basicSalary, formData.allowances, formData.epfEmployeeRate, formData.epfEmployerRate, formData.etfRate, formData.apitScenario]);

  const loadEmployees = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await axios.put(`${import.meta.env.VITE_API_URL}/employees/${editingEmployee._id}`, formData);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/employees`, formData);
      }
      setShowModal(false);
      resetForm();
      loadEmployees();
    } catch (error) {
      console.error('Failed to save employee:', error);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone || '',
      nic: (employee as any).nic || '',
      address: (employee as any).address || '',
      designation: employee.designation || '',
      department: employee.department || '',
      joinDate: (employee as any).joinDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      basicSalary: employee.basicSalary,
      allowances: (employee as any).allowances || 0,
      epfEmployeeRate: (employee as any).epfEmployeeRate || 8,
      epfEmployerRate: (employee as any).epfEmployerRate || 12,
      etfRate: (employee as any).etfRate || 3,
      apitScenario: (employee as any).apitScenario || 'employee',
      status: employee.status,
      userAccount: employee.userAccount || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/employees/${id}`);
      loadEmployees();
    } catch (error) {
      console.error('Failed to delete employee:', error);
    }
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      employeeId: '',
      fullName: '',
      email: '',
      phone: '',
      nic: '',
      address: '',
      designation: '',
      department: '',
      joinDate: new Date().toISOString().split('T')[0],
      basicSalary: 0,
      allowances: 0,
      epfEmployeeRate: 8,
      epfEmployerRate: 12,
      etfRate: 3,
      apitScenario: 'employee',
      status: 'active',
      userAccount: ''
    });
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t('employees.title')}</h1>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus size={20} />
          {t('employees.addEmployee')}
        </button>
      </div>

      <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('employees.employeeId') || 'Employee ID'}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('common.name')}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('employees.designation')}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('employees.department') || 'Department'}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('employees.basicSalary')}</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">{t('common.status')}</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map((employee) => (
              <tr key={employee._id} className="hover:bg-accent/50">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{employee.employeeId}</td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{employee.fullName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail size={12} />
                      {employee.email}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{employee.designation || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{employee.department || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-foreground font-medium">
                  LKR {employee.basicSalary.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    employee.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {employee.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(employee)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                  >
                    <Edit size={14} />
                    {t('employees.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(employee._id)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                  >
                    <Trash2 size={14} />
                    {t('employees.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">{t('employees.noEmployees')}</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-2xl p-6 m-4 border border-border max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              {editingEmployee ? t('employees.editTitle') : t('employees.addNew')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.employeeId')} *</label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">
                    <span className="flex items-center gap-1">
                      <Link size={14} />
                      {t('employees.linkUserAccount') || 'Link to User Account'}
                    </span>
                  </label>
                  <select
                    value={formData.userAccount}
                    onChange={(e) => setFormData({ ...formData, userAccount: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="">{t('employees.noUserLink') || '-- No linked user --'}</option>
                    {availableUsers
                      .filter(u => !editingEmployee?.userAccount || u._id === editingEmployee.userAccount || 
                        !employees.some(e => e.userAccount === u._id && e._id !== editingEmployee?._id))
                      .map(user => (
                        <option key={user._id} value={user._id}>
                          {user.fullName || user.email} ({user.email})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.fullName')} *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  />
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.email')} *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.nic')}</label>
                  <input
                    type="text"
                    value={formData.nic}
                    onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.status')}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="active">{t('employees.active')}</option>
                    <option value="inactive">{t('employees.inactive')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.address')}</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.designation')}</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.department')}</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.joinDate')}</label>
                  <input
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.basicSalary')} *</label>
                  <input
                    type="number"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('payroll.allowances')}</label>
                  <input
                    type="number"
                    value={formData.allowances}
                    onChange={(e) => setFormData({ ...formData, allowances: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.apitScenario')}</label>
                  <select
                    value={formData.apitScenario}
                    onChange={(e) => setFormData({ ...formData, apitScenario: e.target.value as 'employee' | 'employer' })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="employee">{t('employees.scenarioEmployee')}</option>
                    <option value="employer">{t('employees.scenarioEmployer')}</option>
                  </select>
                </div>
              </div>

              {/* Tax Configuration Info */}
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <h3 className="text-sm font-semibold mb-3 text-foreground">{t('employees.epfRates')}</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('employees.epfEmployee')}:</span>
                    <span className="ml-2 font-medium text-foreground">{formData.epfEmployeeRate}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('employees.epfEmployer')}:</span>
                    <span className="ml-2 font-medium text-foreground">{formData.epfEmployerRate}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('employees.etf')}:</span>
                    <span className="ml-2 font-medium text-foreground">{formData.etfRate}%</span>
                  </div>
                </div>
              </div>

              {/* Payroll Calculations Preview */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
                <h3 className="text-sm font-semibold mb-3 text-foreground">{t('employees.salaryPreview')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('employees.grossSalary')}:</span>
                    <span className="font-medium text-foreground">LKR {calculations.grossSalary.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border my-2"></div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('employees.epfEmployee')} ({formData.epfEmployeeRate}%):</span>
                    <span className="font-medium text-foreground">LKR {calculations.epfEmployee.toLocaleString()}</span>
                  </div>
                  {formData.apitScenario === 'employee' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('employees.apit')}:</span>
                      <span className="font-medium text-foreground">LKR {calculations.apit.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('employees.stampFee')}:</span>
                    <span className="font-medium text-foreground">LKR {calculations.stampFee.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border my-2"></div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-foreground">{t('employees.netSalary')}:</span>
                    <span className="text-primary">LKR {calculations.netSalary.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border my-2"></div>
                  <div className="text-xs text-muted-foreground mt-3">
                    <div className="font-medium mb-1">{t('employees.employerCosts')}:</div>
                    <div className="flex justify-between">
                      <span>{t('employees.epfEmployer')} ({formData.epfEmployerRate}%):</span>
                      <span>LKR {calculations.epfEmployer.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('employees.etf')} ({formData.etfRate}%):</span>
                      <span>LKR {calculations.etf.toLocaleString()}</span>
                    </div>
                    {formData.apitScenario === 'employer' && (
                      <div className="flex justify-between">
                        <span>{t('employees.apit')} ({t('employees.scenarioEmployer')}):</span>
                        <span>LKR {calculations.apit.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-border">
                      <span>{t('employees.totalCTC')}:</span>
                      <span>LKR {calculations.totalCTC.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  {editingEmployee ? t('common.save') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
