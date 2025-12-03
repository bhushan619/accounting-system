import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  User, FileText, Download, Edit, Check, X, Clock, 
  Building2, Phone, Mail, MapPin, CreditCard 
} from 'lucide-react';

interface Employee {
  _id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  designation?: string;
  department?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranch?: string;
}

interface Payslip {
  _id: string;
  serialNumber: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  grossSalary: number;
  epfEmployee: number;
  epfEmployer: number;
  etf: number;
  apit: number;
  stampFee: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
}

interface UpdateRequest {
  _id: string;
  status: string;
  requestedChanges: any;
  createdAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export default function EmployeePortal() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'profile' | 'payslips' | 'requests'>('profile');
  const [profile, setProfile] = useState<Employee | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'profile') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/employee-portal/profile`);
        setProfile(res.data);
        setEditData({
          phone: res.data.phone || '',
          address: res.data.address || '',
          email: res.data.email || '',
          bankName: res.data.bankName || '',
          bankAccountNumber: res.data.bankAccountNumber || '',
          bankAccountName: res.data.bankAccountName || '',
          bankBranch: res.data.bankBranch || ''
        });
      } else if (activeTab === 'payslips') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/employee-portal/payslips`);
        setPayslips(res.data);
      } else if (activeTab === 'requests') {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/employee-portal/profile-update-requests`);
        setRequests(res.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const handleSubmitUpdateRequest = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/employee-portal/profile-update-request`, editData);
      alert('Update request submitted for admin approval');
      setEditMode(false);
      fetchData();
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request');
    }
    setSubmitting(false);
  };

  const downloadPayslip = (payslip: Payslip) => {
    // Generate simple text payslip for download
    const content = `
PAYSLIP
=======
Employee: ${profile?.fullName}
Period: ${getMonthName(payslip.month)} ${payslip.year}
Serial: ${payslip.serialNumber}

EARNINGS
--------
Basic Salary: LKR ${payslip.basicSalary.toLocaleString()}
Allowances: LKR ${payslip.allowances.toLocaleString()}
Gross Salary: LKR ${payslip.grossSalary.toLocaleString()}

DEDUCTIONS
----------
EPF (Employee): LKR ${payslip.epfEmployee.toLocaleString()}
APIT: LKR ${payslip.apit.toLocaleString()}
Stamp Fee: LKR ${payslip.stampFee.toLocaleString()}
Total Deductions: LKR ${payslip.totalDeductions.toLocaleString()}

NET SALARY: LKR ${payslip.netSalary.toLocaleString()}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${payslip.year}-${payslip.month}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('employeePortal.title') || 'Employee Portal'}</h1>
        <p className="text-muted-foreground mt-2">{t('employeePortal.subtitle') || 'View your payslips and manage your profile'}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'profile' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="inline mr-2" size={18} />
          {t('employeePortal.profile') || 'My Profile'}
        </button>
        <button
          onClick={() => setActiveTab('payslips')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'payslips' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="inline mr-2" size={18} />
          {t('employeePortal.payslips') || 'Payslips'}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'requests' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="inline mr-2" size={18} />
          {t('employeePortal.updateRequests') || 'Update Requests'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Profile Tab */}
          {activeTab === 'profile' && profile && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">{t('employeePortal.personalInfo') || 'Personal Information'}</h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    <Edit size={16} />
                    {t('employeePortal.requestUpdate') || 'Request Update'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                    >
                      <X size={16} />
                      {t('cancel') || 'Cancel'}
                    </button>
                    <button
                      onClick={handleSubmitUpdateRequest}
                      disabled={submitting}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Check size={16} />
                      {t('employeePortal.submitRequest') || 'Submit Request'}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Read-only fields */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t('employeeId') || 'Employee ID'}</label>
                  <p className="text-foreground font-medium">{profile.employeeId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t('fullName') || 'Full Name'}</label>
                  <p className="text-foreground font-medium">{profile.fullName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t('designation') || 'Designation'}</label>
                  <p className="text-foreground">{profile.designation || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t('department') || 'Department'}</label>
                  <p className="text-foreground">{profile.department || '-'}</p>
                </div>

                {/* Editable fields */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    <Mail className="inline mr-1" size={14} />
                    {t('email') || 'Email'}
                  </label>
                  {editMode ? (
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  ) : (
                    <p className="text-foreground">{profile.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    <Phone className="inline mr-1" size={14} />
                    {t('phone') || 'Phone'}
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  ) : (
                    <p className="text-foreground">{profile.phone || '-'}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    <MapPin className="inline mr-1" size={14} />
                    {t('address') || 'Address'}
                  </label>
                  {editMode ? (
                    <textarea
                      value={editData.address}
                      onChange={(e) => setEditData({...editData, address: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      rows={2}
                    />
                  ) : (
                    <p className="text-foreground">{profile.address || '-'}</p>
                  )}
                </div>
              </div>

              {/* Bank Details */}
              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CreditCard size={20} />
                  {t('employeePortal.bankDetails') || 'Bank Details'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t('bankName') || 'Bank Name'}</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editData.bankName}
                        onChange={(e) => setEditData({...editData, bankName: e.target.value})}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      />
                    ) : (
                      <p className="text-foreground">{profile.bankName || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t('accountNumber') || 'Account Number'}</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editData.bankAccountNumber}
                        onChange={(e) => setEditData({...editData, bankAccountNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      />
                    ) : (
                      <p className="text-foreground">{profile.bankAccountNumber || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t('accountName') || 'Account Name'}</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editData.bankAccountName}
                        onChange={(e) => setEditData({...editData, bankAccountName: e.target.value})}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      />
                    ) : (
                      <p className="text-foreground">{profile.bankAccountName || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t('branch') || 'Branch'}</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editData.bankBranch}
                        onChange={(e) => setEditData({...editData, bankBranch: e.target.value})}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      />
                    ) : (
                      <p className="text-foreground">{profile.bankBranch || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payslips Tab */}
          {activeTab === 'payslips' && (
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('period') || 'Period'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('grossSalary') || 'Gross'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('deductions') || 'Deductions'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t('netSalary') || 'Net'}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('status') || 'Status'}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('actions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payslips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {t('employeePortal.noPayslips') || 'No payslips available'}
                      </td>
                    </tr>
                  ) : (
                    payslips.map((payslip) => (
                      <tr key={payslip._id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          {getMonthName(payslip.month)} {payslip.year}
                        </td>
                        <td className="px-4 py-3 text-right">LKR {payslip.grossSalary.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-red-600">-{payslip.totalDeductions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          LKR {payslip.netSalary.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payslip.status)}`}>
                            {payslip.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => downloadPayslip(payslip)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title={t('download') || 'Download'}
                          >
                            <Download size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Update Requests Tab */}
          {activeTab === 'requests' && (
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('date') || 'Date'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('changes') || 'Requested Changes'}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">{t('status') || 'Status'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t('notes') || 'Notes'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        {t('employeePortal.noRequests') || 'No update requests'}
                      </td>
                    </tr>
                  ) : (
                    requests.map((request) => (
                      <tr key={request._id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <ul className="text-sm space-y-1">
                            {Object.entries(request.requestedChanges)
                              .filter(([_, value]) => value)
                              .map(([key, value]) => (
                                <li key={key}>
                                  <span className="text-muted-foreground">{key}:</span> {value as string}
                                </li>
                              ))}
                          </ul>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {request.reviewNotes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
