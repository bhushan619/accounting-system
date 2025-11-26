import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, DollarSign, Calculator } from 'lucide-react';

interface Payroll {
  _id: string;
  serialNumber: string;
  employee: { _id: string; fullName: string; employeeId: string };
  month: number;
  year: number;
  grossSalary: number;
  netSalary: number;
  totalCTC: number;
  apitEmployer?: number;
  status: string;
}

export default function Payroll() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employee: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basicSalary: 0,
    allowances: 0,
    notes: '',
    status: 'draft'
  });
  const [calculations, setCalculations] = useState<any>({
    grossSalary: 0,
    epfEmployee: 0,
    epfEmployer: 0,
    etf: 0,
    apit: 0,
    apitEmployer: 0,
    stampFee: 25,
    totalDeductions: 0,
    netSalary: 0,
    totalCTC: 0,
    apitScenario: 'employee'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.employee) {
      const employee = employees.find(e => e._id === formData.employee);
      if (employee) {
        // First, populate the form with employee's default values
        const employeeAllowances = employee.allowances || 0;
        setFormData(prev => ({
          ...prev,
          basicSalary: employee.basicSalary,
          allowances: employeeAllowances
        }));

        // Then fetch calculations from backend with employee's allowances
        axios.post(`${import.meta.env.VITE_API_URL}/payroll/calculate`, {
          employeeId: formData.employee,
          month: formData.month,
          year: formData.year,
          allowances: employeeAllowances
        }).then(response => {
          const calc = response.data;
          setCalculations({
            grossSalary: calc.grossSalary,
            epfEmployee: calc.epfEmployee,
            epfEmployer: calc.epfEmployer,
            etf: calc.etf,
            apit: calc.apit,
            apitEmployer: calc.apitEmployer || 0,
            stampFee: calc.stampFee,
            totalDeductions: calc.totalDeductions,
            netSalary: calc.netSalary,
            totalCTC: calc.totalCTC,
            apitScenario: calc.apitScenario
          });
        }).catch(error => {
          console.error('Failed to calculate:', error);
        });
      }
    }
  }, [formData.employee, employees]);

  useEffect(() => {
    // Recalculate when allowances change
    if (formData.employee && formData.allowances !== undefined) {
      axios.post(`${import.meta.env.VITE_API_URL}/payroll/calculate`, {
        employeeId: formData.employee,
        month: formData.month,
        year: formData.year,
        allowances: formData.allowances
      }).then(response => {
        const calc = response.data;
        setCalculations({
          grossSalary: calc.grossSalary,
          epfEmployee: calc.epfEmployee,
          epfEmployer: calc.epfEmployer,
          etf: calc.etf,
          apit: calc.apit,
          apitEmployer: calc.apitEmployer || 0,
          stampFee: calc.stampFee,
          totalDeductions: calc.totalDeductions,
          netSalary: calc.netSalary,
          totalCTC: calc.totalCTC,
          apitScenario: calc.apitScenario
        });
      }).catch(error => {
        console.error('Failed to recalculate:', error);
      });
    }
  }, [formData.allowances, formData.employee, formData.month, formData.year]);

  const loadData = async () => {
    try {
      const [payrollsRes, employeesRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/payroll`),
        axios.get(`${import.meta.env.VITE_API_URL}/employees`)
      ]);
      setPayrolls(payrollsRes.data);
      setEmployees(employeesRes.data.filter((e: any) => e.status === 'active'));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/payroll`, {
        ...formData,
        ...calculations
      });
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save payroll:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      employee: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      basicSalary: 0,
      allowances: 0,
      notes: '',
      status: 'draft'
    });
    setCalculations({
      grossSalary: 0,
      epfEmployee: 0,
      epfEmployer: 0,
      etf: 0,
      apit: 0,
      apitEmployer: 0,
      stampFee: 25,
      totalDeductions: 0,
      netSalary: 0,
      totalCTC: 0,
      apitScenario: 'employee'
    });
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Payroll Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus size={20} />
          Create Payroll
        </button>
      </div>

      <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Payroll #</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Employee</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Period</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Gross Salary</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Net Salary</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payrolls.map((payroll) => (
              <tr key={payroll._id} className="hover:bg-accent/50">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{payroll.serialNumber}</td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{payroll.employee?.fullName}</p>
                    <p className="text-xs text-muted-foreground">{payroll.employee?.employeeId}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {getMonthName(payroll.month)} {payroll.year}
                </td>
                <td className="px-6 py-4 text-sm text-foreground font-medium">
                  LKR {payroll.grossSalary.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-foreground font-bold">
                  LKR {payroll.netSalary.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(payroll.status)}`}>
                    {payroll.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payrolls.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No payroll records found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-3xl p-6 m-4 border border-border max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Create Payroll</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Employee *</label>
                  <select
                    value={formData.employee}
                    onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee._id} value={employee._id}>
                        {employee.fullName} ({employee.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Month</label>
                    <select
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Year</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Basic Salary</label>
                  <input
                    type="number"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Allowances</label>
                  <input
                    type="number"
                    value={formData.allowances}
                    onChange={(e) => setFormData({ ...formData, allowances: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="text-primary" size={20} />
                  <h3 className="font-semibold text-foreground">
                    Calculations (Sri Lankan Compliance - {calculations.apitScenario === 'employer' ? 'Scenario B' : 'Scenario A'})
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Salary:</span>
                    <span className="font-medium text-foreground">LKR {calculations.grossSalary.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EPF Employee:</span>
                    <span className="font-medium text-foreground">LKR {calculations.epfEmployee.toFixed(2)}</span>
                  </div>
                  {calculations.apitScenario === 'employee' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">APIT (Employee):</span>
                      <span className="font-medium text-foreground">LKR {calculations.apit.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stamp Fee:</span>
                    <span className="font-medium text-foreground">LKR {calculations.stampFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Deductions:</span>
                    <span className="font-medium text-red-600">LKR {calculations.totalDeductions.toFixed(2)}</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-foreground">Net Salary:</span>
                    <span className="font-bold text-lg text-green-600">LKR {calculations.netSalary.toFixed(2)}</span>
                  </div>
                </div>
                <div className="bg-accent p-3 rounded">
                  <div className="text-xs text-muted-foreground mb-1">Employer Contributions</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">EPF Employer:</span>
                      <span className="font-medium text-foreground">LKR {calculations.epfEmployer.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ETF:</span>
                      <span className="font-medium text-foreground">LKR {calculations.etf.toFixed(2)}</span>
                    </div>
                    {calculations.apitScenario === 'employer' && calculations.apitEmployer > 0 && (
                      <div className="flex justify-between col-span-2">
                        <span className="text-muted-foreground">APIT (Employer Pays):</span>
                        <span className="font-medium text-foreground">LKR {calculations.apitEmployer.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 mt-2 border-t border-border flex justify-between">
                    <span className="font-semibold text-foreground">Total CTC:</span>
                    <span className="font-bold text-primary">LKR {calculations.totalCTC.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Create Payroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
