import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Trash2, Plus, X, Eye } from 'lucide-react';

interface PayrollRun {
  _id: string;
  runNumber: string;
  month: number;
  year: number;
  status: string;
  totalEmployees: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalDeductions: number;
  createdAt: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  fullName: string;
  status: string;
}

export default function PayrollRuns() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [runsRes, employeesRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/payrollruns`),
        axios.get(`${import.meta.env.VITE_API_URL}/employees`)
      ]);
      setRuns(runsRes.data);
      setEmployees(employeesRes.data.filter((e: Employee) => e.status === 'active'));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }
    
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/payrollruns/generate`, {
        ...formData,
        employeeIds: selectedEmployees
      });
      loadData();
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to generate payroll run');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payroll run and all associated entries?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/payrollruns/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedEmployees(employees.map(e => e._id));
  };

  const deselectAll = () => {
    setSelectedEmployees([]);
  };

  const resetForm = () => {
    setFormData({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    });
    setSelectedEmployees([]);
    setShowModal(false);
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Payroll Runs</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus size={20} />
          Generate Payroll Run
        </button>
      </div>

      <div className="bg-card rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Run #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Employees</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Gross</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Deductions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Net</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {runs.map((run) => (
              <tr key={run._id} className="hover:bg-accent/50">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{run.runNumber}</td>
                <td className="px-6 py-4 text-sm text-foreground">
                  {getMonthName(run.month)} {run.year}
                </td>
                <td className="px-6 py-4 text-sm text-foreground">{run.totalEmployees}</td>
                <td className="px-6 py-4 text-sm text-foreground">
                  Rs. {run.totalGrossSalary.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-destructive">
                  Rs. {run.totalDeductions.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-foreground">
                  Rs. {run.totalNetSalary.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(run.status)}`}>
                    {run.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(run._id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-foreground">Generate Payroll Run</h2>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Month</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i} value={i + 1}>{getMonthName(i + 1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Year</label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-foreground">
                    Select Employees ({selectedEmployees.length} selected)
                  </label>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs text-primary hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
                  {employees.map((emp) => (
                    <label
                      key={emp._id}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-accent cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp._id)}
                        onChange={() => toggleEmployee(emp._id)}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-foreground">
                        {emp.employeeId} - {emp.fullName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Generate Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
