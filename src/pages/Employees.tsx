import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Mail, Link, XCircle, Clock, Upload, Download, ArrowUp, ArrowDown, ArrowUpDown, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePreventSwipe } from '../hooks/usePreventSwipe';

type SortKey = 'employeeId' | 'fullName' | 'designation' | 'department' | 'basicSalary' | 'status';
type SortDir = 'asc' | 'desc';

interface Employee {
  _id: string;
  employeeId: string;
  fullName: string;
  nickname?: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  basicSalary: number;
  status: string;
  userAccount?: string;
  probationEndDate?: string;
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

const DEPARTMENTS = ['HR department', 'R&D department'];
const STATUS_OPTIONS = [
  { value: 'under_probation', label: 'Under Probation' },
  { value: 'confirmed', label: 'Confirmed (Post Probation)' },
  { value: 'closed', label: 'Closed' }
];

export default function Employees() {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [_taxConfigs, setTaxConfigs] = useState<TaxConfig[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    epfNumber: '',
    fullName: '',
    nickname: '',
    email: '',
    phone: '',
    nic: '',
    address: '',
    basicInformation: '',
    designation: '',
    department: '',
    joinDate: new Date().toISOString().split('T')[0],
    basicSalary: 0,
    transportAllowance: 0,
    performanceSalaryProbation: 0,
    performanceSalaryConfirmed: 0,
    probationEndDate: '',
    epfEmployeeRate: 8,
    epfEmployerRate: 12,
      etfRate: 3,
      apitScenario: 'employee',
      status: 'under_probation',
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

  // Disable swipe gestures when modal is open
  usePreventSwipe(showModal);

  const loadAvailableUsers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/users`);
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

  // Calculate APIT based on slab system with scenario support
  const calculateAPIT = (grossSalary: number, scenario: string = 'employee'): number => {
    const employeeSlabs = [
      { minIncome: 0, maxIncome: 150000, rate: 0, standardDeduction: 0 },
      { minIncome: 150001, maxIncome: 233333, rate: 6, standardDeduction: 9000 },
      { minIncome: 233334, maxIncome: 275000, rate: 18, standardDeduction: 37000 },
      { minIncome: 275001, maxIncome: 316667, rate: 24, standardDeduction: 53500 },
      { minIncome: 316668, maxIncome: 358333, rate: 30, standardDeduction: 72500 },
      { minIncome: 358334, maxIncome: null, rate: 36, standardDeduction: 94000 }
    ];

    const employerSlabs = [
      { minIncome: 0, maxIncome: 150000, rate: 0, standardDeduction: 0 },
      { minIncome: 150001, maxIncome: 228333, rate: 6.38, standardDeduction: 9570 },
      { minIncome: 228334, maxIncome: 262500, rate: 21.95, standardDeduction: 45119 },
      { minIncome: 262501, maxIncome: 294167, rate: 32.56, standardDeduction: 73000 },
      { minIncome: 294168, maxIncome: 323333, rate: 42.86, standardDeduction: 103580 },
      { minIncome: 323334, maxIncome: null, rate: 56.25, standardDeduction: 146875 }
    ];

    const slabs = scenario === 'employer' ? employerSlabs : employeeSlabs;
    let applicableSlab = slabs[0];
    for (const slab of slabs) {
      if (grossSalary >= slab.minIncome) {
        if (slab.maxIncome === null || grossSalary <= slab.maxIncome) {
          applicableSlab = slab;
          break;
        }
      }
    }

    const apit = (grossSalary * applicableSlab.rate / 100) - applicableSlab.standardDeduction;
    return Math.max(0, Math.round(apit * 100) / 100);
  };

  // Get current performance salary based on status
  const getCurrentPerformanceSalary = () => {
    if (formData.status === 'confirmed') {
      return formData.performanceSalaryConfirmed;
    }
    if (formData.status === 'under_probation') {
      if (formData.probationEndDate && new Date() > new Date(formData.probationEndDate)) {
        return formData.performanceSalaryConfirmed;
      }
      return formData.performanceSalaryProbation;
    }
    return 0;
  };

  // Recalculate whenever salary or rates change
  useEffect(() => {
    const performanceSalary = getCurrentPerformanceSalary();
    const grossSalary = formData.basicSalary + formData.transportAllowance + performanceSalary;
    // EPF and ETF calculated on (Basic + Performance Salary)
    const epfEtfBase = formData.basicSalary + performanceSalary;
    const epfEmployee = (epfEtfBase * formData.epfEmployeeRate) / 100;
    const epfEmployer = (epfEtfBase * formData.epfEmployerRate) / 100;
    const etf = (epfEtfBase * formData.etfRate) / 100;
    const apit = calculateAPIT(grossSalary, formData.apitScenario);
    const stampFee = 25;

    // Scenario A: Employee pays APIT - deducted from salary
    // Scenario B: Employer pays APIT - added to employer costs, not deducted from salary
    const apitDeduction = formData.apitScenario === 'employee' ? apit : 0;
    const netSalary = grossSalary - epfEmployee - apitDeduction - stampFee;
    const apitEmployerCost = formData.apitScenario === 'employer' ? apit : 0;
    const totalCTC = grossSalary + epfEmployer + etf + apitEmployerCost;

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
  }, [formData.basicSalary, formData.transportAllowance, formData.performanceSalaryProbation, formData.performanceSalaryConfirmed, formData.status, formData.probationEndDate, formData.epfEmployeeRate, formData.epfEmployerRate, formData.etfRate, formData.apitScenario]);

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
      const submitData = {
        ...formData,
        userAccount: formData.userAccount || null,
        probationEndDate: formData.probationEndDate || null
      };
      
      if (editingEmployee) {
        await axios.put(`${import.meta.env.VITE_API_URL}/employees/${editingEmployee._id}`, submitData);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/employees`, submitData);
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
    const emp = employee as any;
    setFormData({
      employeeId: employee.employeeId,
      epfNumber: emp.epfNumber || '',
      fullName: employee.fullName,
      nickname: emp.nickname || '',
      email: employee.email,
      phone: employee.phone || '',
      nic: emp.nic || '',
      address: emp.address || '',
      basicInformation: emp.basicInformation || '',
      designation: employee.designation || '',
      department: employee.department || '',
      joinDate: emp.joinDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      basicSalary: employee.basicSalary,
      transportAllowance: emp.transportAllowance || emp.allowances || 0,
      performanceSalaryProbation: emp.performanceSalaryProbation || 0,
      performanceSalaryConfirmed: emp.performanceSalaryConfirmed || 0,
      probationEndDate: emp.probationEndDate?.split('T')[0] || '',
      epfEmployeeRate: emp.epfEmployeeRate || 8,
      epfEmployerRate: emp.epfEmployerRate || 12,
      etfRate: emp.etfRate || 3,
      apitScenario: emp.apitScenario || 'employee',
      status: employee.status || 'under_probation',
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

  const handleCloseEmployee = async (id: string) => {
    const closeDateStr = prompt('Enter close date (YYYY-MM-DD) or leave empty for today:');
    if (closeDateStr === null) return; // User cancelled
    if (!confirm('Are you sure you want to close this employee record? This will mark them as inactive.')) return;
    try {
      const closeDate = closeDateStr?.trim() ? new Date(closeDateStr.trim()).toISOString() : new Date().toISOString();
      await axios.put(`${import.meta.env.VITE_API_URL}/employees/${id}`, { status: 'closed', closeDate });
      loadEmployees();
    } catch (error) {
      console.error('Failed to close employee:', error);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedEmployees.map(e => e._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} employee(s)?`)) return;
    setBulkDeleting(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/employees/bulk-delete`, { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      loadEmployees();
    } catch (error) {
      console.error('Failed to bulk delete:', error);
    } finally {
      setBulkDeleting(false);
    }
  };

  const getDaysRemaining = (probationEndDate?: string): number | null => {
    if (!probationEndDate) return null;
    const endDate = new Date(probationEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProbationIndicator = (employee: Employee) => {
    if (employee.status !== 'under_probation') return null;
    const daysRemaining = getDaysRemaining(employee.probationEndDate);
    if (daysRemaining === null) return null;
    
    if (daysRemaining <= 0) {
      return <span className="text-xs text-green-600 flex items-center gap-1"><Clock size={12} /> Probation ended</span>;
    } else if (daysRemaining <= 7) {
      return <span className="text-xs text-red-600 flex items-center gap-1"><Clock size={12} /> {daysRemaining} days left</span>;
    } else if (daysRemaining <= 30) {
      return <span className="text-xs text-orange-600 flex items-center gap-1"><Clock size={12} /> {daysRemaining} days left</span>;
    } else {
      return <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> {daysRemaining} days left</span>;
    }
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      employeeId: '',
      epfNumber: '',
      fullName: '',
      nickname: '',
      email: '',
      phone: '',
      nic: '',
      address: '',
      basicInformation: '',
      designation: '',
      department: '',
      joinDate: new Date().toISOString().split('T')[0],
      basicSalary: 0,
      transportAllowance: 0,
      performanceSalaryProbation: 0,
      performanceSalaryConfirmed: 0,
      probationEndDate: '',
      epfEmployeeRate: 8,
      epfEmployerRate: 12,
      etfRate: 3,
      apitScenario: 'employee',
      status: 'under_probation',
      userAccount: ''
    });
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/employees/template`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employee-import-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/employees/import`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(response.data);
      if (response.data.created > 0) {
        loadEmployees();
        // Auto-close modal after successful import with no errors
        if (response.data.errors.length === 0) {
          setTimeout(() => {
            setShowImportModal(false);
            setImportFile(null);
            setImportResult(null);
          }, 1500);
        }
      }
    } catch (error: any) {
      setImportResult({ created: 0, skipped: 0, errors: [error.response?.data?.error || 'Import failed'] });
    } finally {
      setImporting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return option?.label || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'under_probation':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={14} className="text-muted-foreground/50" />;
    return sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      let aVal: any = a[sortKey] ?? '';
      let bVal: any = b[sortKey] ?? '';
      if (sortKey === 'basicSalary') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [employees, sortKey, sortDir]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">{t('employees.title')}</h1>
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50"
            >
              <Trash2 size={16} />
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size} selected`}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowImportModal(true); setImportFile(null); setImportResult(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
          >
            <Upload size={20} />
            Import Excel
          </button>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus size={20} />
            {t('employees.addEmployee')}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={sortedEmployees.length > 0 && selectedIds.size === sortedEmployees.length}
                  onChange={toggleSelectAll}
                  className="rounded border-border"
                />
              </th>
              {([
                ['employeeId', t('employees.employeeId') || 'Employee ID'],
                ['fullName', t('common.name')],
                ['designation', t('employees.designation')],
                ['department', t('employees.department') || 'Department'],
                ['basicSalary', t('employees.basicSalary')],
                ['status', t('common.status')],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-6 py-3 text-left text-sm font-semibold text-foreground cursor-pointer select-none hover:bg-accent/50"
                >
                  <span className="inline-flex items-center gap-1">{label} <SortIcon col={key} /></span>
                </th>
              ))}
              <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedEmployees.map((employee) => (
              <tr key={employee._id} className={`hover:bg-accent/50 ${selectedIds.has(employee._id) ? 'bg-accent/30' : ''}`}>
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(employee._id)}
                    onChange={() => toggleSelect(employee._id)}
                    className="rounded border-border"
                  />
                </td>
                <td className="px-6 py-4 text-sm font-medium text-foreground">{employee.employeeId}</td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {employee.fullName}
                      {employee.nickname && <span className="text-muted-foreground font-normal"> ({employee.nickname})</span>}
                    </p>
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
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium w-fit ${getStatusColor(employee.status)}`}>
                      {getStatusLabel(employee.status)}
                    </span>
                    {getProbationIndicator(employee)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(employee)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                  >
                    <Edit size={14} />
                    {t('employees.edit')}
                  </button>
                  {employee.status !== 'closed' && (
                    <button
                      onClick={() => handleCloseEmployee(employee._id)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-orange-100 text-orange-800 rounded hover:bg-orange-200"
                      title="Close employee record"
                    >
                      <XCircle size={14} />
                      Close
                    </button>
                  )}
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
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.epfNumber') || 'EPF Number'}</label>
                  <input
                    type="text"
                    value={formData.epfNumber}
                    onChange={(e) => setFormData({ ...formData, epfNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="EPF registration number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">
                    <span className="flex items-center gap-1">
                      <Link size={14} />
                      {t('employees.linkUserAccount') || 'Link to User Account'}
                    </span>
                  </label>
                  <select
                    value={formData.userAccount}
                    onChange={(e) => {
                      const selectedUserId = e.target.value;
                      const selectedUser = availableUsers.find(u => u._id === selectedUserId);
                      if (selectedUser) {
                        setFormData({ 
                          ...formData, 
                          userAccount: selectedUserId,
                          email: selectedUser.email,
                          fullName: selectedUser.fullName || formData.fullName
                        });
                      } else {
                        setFormData({ 
                          ...formData, 
                          userAccount: '',
                          email: '',
                          fullName: ''
                        });
                      }
                    }}
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

              <div className="grid grid-cols-3 gap-4">
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
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Nickname</label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="Optional"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.nic')}</label>
                  <input
                    type="text"
                    value={formData.nic}
                    onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.department')}</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="">-- Select Department --</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.designation')}</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
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

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Basic Information</label>
                <textarea
                  value={formData.basicInformation}
                  onChange={(e) => setFormData({ ...formData, basicInformation: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  rows={3}
                  placeholder="Additional employee information..."
                />
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
                  <label className="block text-sm font-medium mb-1 text-foreground">Probation End Date</label>
                  <input
                    type="date"
                    value={formData.probationEndDate}
                    onChange={(e) => setFormData({ ...formData, probationEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('common.status')} *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.apitScenario') || 'APIT Scenario'}</label>
                  <select
                    value={formData.apitScenario}
                    onChange={(e) => setFormData({ ...formData, apitScenario: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="employee">{t('employees.scenarioEmployee') || 'Scenario A (Employee Pays APIT)'}</option>
                    <option value="employer">{t('employees.scenarioEmployer') || 'Scenario B (Employer Pays APIT)'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">{t('employees.basicSalary')} *</label>
                  <input
                    type="number"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Transport Allowance</label>
                  <input
                    type="number"
                    value={formData.transportAllowance}
                    onChange={(e) => setFormData({ ...formData, transportAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Performance Salary (Under Probation)</label>
                  <input
                    type="number"
                    value={formData.performanceSalaryProbation}
                    onChange={(e) => setFormData({ ...formData, performanceSalaryProbation: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Performance Salary (Post Probation)</label>
                  <input
                    type="number"
                    value={formData.performanceSalaryConfirmed}
                    onChange={(e) => setFormData({ ...formData, performanceSalaryConfirmed: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    min={0}
                  />
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t('employees.apit')} ({formData.apitScenario === 'employee' ? 'Scenario A' : 'Scenario B'}):
                    </span>
                    <span className="font-medium text-foreground">
                      LKR {calculations.apit.toLocaleString()}
                      {formData.apitScenario === 'employer' && <span className="text-xs text-muted-foreground ml-1">(employer pays)</span>}
                    </span>
                  </div>
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

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-lg p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Import Employees from Excel</h2>
            
            <div className="mb-4">
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Download size={16} />
                Download Template (.xlsx)
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-foreground">Select Excel File</label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportResult(null); }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Supported formats: .xlsx, .xls, .csv (max 5MB)</p>
            </div>

            {importResult && (
              <div className="mb-4 p-3 rounded-lg border border-border bg-muted/50">
                <p className="text-sm font-medium text-foreground mb-1">
                  Import Results: {importResult.created} created, {importResult.skipped} skipped
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {importing && <Loader2 className="animate-spin" size={16} />}
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
