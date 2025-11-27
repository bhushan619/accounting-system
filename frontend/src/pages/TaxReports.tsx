import React, { useState } from 'react';
import { Download, FileText, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { jsPDF } from 'jspdf';

interface TaxReportData {
  period: { startDate: string; endDate: string };
  company: { name: string; tin: string; address: string };
  income: {
    totalRevenue: number;
    paidInvoices: any[];
  };
  expenses: {
    totalExpenses: number;
    approvedExpenses: any[];
  };
  payroll: {
    totalGross: number;
    totalEPFEmployee: number;
    totalEPFEmployer: number;
    totalETF: number;
    totalAPIT: number;
    totalAPIT_Employee: number;
    totalAPIT_Employer: number;
    totalStampFee: number;
    payrollEntries: any[];
    payrollExpenses: any[];
  };
  vat: {
    totalVATCollected: number;
    totalVATPaid: number;
  };
}

export default function TaxReports() {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyTIN, setCompanyTIN] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [error, setError] = useState('');

  const fetchTaxData = async (): Promise<TaxReportData | null> => {
    try {
      const token = localStorage.getItem('token');
      
      const [invoicesRes, expensesRes, payrollRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/invoices`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/expenses`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/payroll`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Filter paid invoices
      const paidInvoices = invoicesRes.data.filter((inv: any) => {
        const invDate = new Date(inv.issueDate);
        return inv.status === 'paid' && invDate >= start && invDate <= end;
      });

      // Filter approved expenses - separate regular expenses from payroll expenses
      const allApprovedExpenses = expensesRes.data.filter((exp: any) => {
        const expDate = new Date(exp.date);
        return exp.status === 'approved' && expDate >= start && expDate <= end;
      });
      
      // Separate payroll expenses (EPF, ETF, APIT) from regular business expenses
      const approvedExpenses = allApprovedExpenses.filter((exp: any) => exp.category !== 'Payroll');
      const payrollExpenses = allApprovedExpenses.filter((exp: any) => exp.category === 'Payroll');

      // Filter paid payroll
      const paidPayroll = payrollRes.data.filter((pay: any) => {
        if (pay.status !== 'paid') return false;
        
        // Use paidDate if available, otherwise use month/year
        let payDate: Date;
        if (pay.paidDate) {
          payDate = new Date(pay.paidDate);
        } else {
          // Create date at the end of the month for better range matching
          payDate = new Date(pay.year, pay.month, 0); // Last day of the month
        }
        
        return payDate >= start && payDate <= end;
      });

      const totalRevenue = paidInvoices.reduce((sum: number, inv: any) => sum + inv.total, 0);
      const totalExpenses = approvedExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
      const totalVATCollected = paidInvoices.reduce((sum: number, inv: any) => sum + inv.tax, 0);
      const totalVATPaid = approvedExpenses.reduce((sum: number, exp: any) => sum + (exp.tax || 0), 0);

      // Calculate payroll statutory contributions from expense records
      const payrollExpenseSummary = payrollExpenses.reduce((acc: any, exp: any) => {
        const desc = exp.description.toLowerCase();
        if (desc.includes('epf employer')) {
          return { ...acc, epfEmployer: acc.epfEmployer + exp.amount };
        } else if (desc.includes('etf')) {
          return { ...acc, etf: acc.etf + exp.amount };
        } else if (desc.includes('apit employer')) {
          return { ...acc, apitEmployer: acc.apitEmployer + exp.amount };
        }
        return acc;
      }, { epfEmployer: 0, etf: 0, apitEmployer: 0 });

      const payrollSummary = paidPayroll.reduce((acc: any, pay: any) => ({
        totalGross: acc.totalGross + pay.grossSalary,
        totalEPFEmployee: acc.totalEPFEmployee + pay.epfEmployee,
        totalEPFEmployer: acc.totalEPFEmployer + pay.epfEmployer,
        totalETF: acc.totalETF + pay.etf,
        // IMPORTANT: APIT is calculated once per employee (stored in "apit" field)
        // "apitEmployer" just tracks who pays it (0 for Scenario A, equals apit for Scenario B)
        // For IRD reporting: Only count "apit" once, and track who bears the cost separately
        totalAPIT_Employee: acc.totalAPIT_Employee + (pay.apitEmployer ? 0 : (pay.apit || 0)),
        totalAPIT_Employer: acc.totalAPIT_Employer + (pay.apitEmployer || 0),
        totalAPIT: acc.totalAPIT + (pay.apit || 0), // Total APIT to remit to IRD (counted once)
        totalStampFee: acc.totalStampFee + pay.stampFee
      }), {
        totalGross: 0,
        totalEPFEmployee: 0,
        totalEPFEmployer: 0,
        totalETF: 0,
        totalAPIT_Employee: 0,
        totalAPIT_Employer: 0,
        totalAPIT: 0,
        totalStampFee: 0
      });

      return {
        period: { startDate, endDate },
        company: { name: companyName, tin: companyTIN, address: companyAddress },
        income: { totalRevenue, paidInvoices },
        expenses: { totalExpenses, approvedExpenses },
        payroll: { 
          ...payrollSummary, 
          payrollEntries: paidPayroll,
          payrollExpenses: payrollExpenses // Include payroll statutory expenses
        },
        vat: { totalVATCollected, totalVATPaid }
      };
    } catch (err: any) {
      console.error('Error fetching tax data:', err);
      setError(err.response?.data?.message || 'Failed to fetch tax data');
      return null;
    }
  };

  const generatePDF = async () => {
    if (!startDate || !endDate || !companyName || !companyTIN) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    const data = await fetchTaxData();
    if (!data) {
      setLoading(false);
      return;
    }

    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX REPORT FOR SRI LANKA INLAND REVENUE DEPARTMENT', 105, yPos, { align: 'center' });
    
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Period: ${data.period.startDate} to ${data.period.endDate}`, 105, yPos, { align: 'center' });

    // Company Details
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPANY INFORMATION', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Company Name: ${data.company.name}`, 20, yPos);
    yPos += 6;
    doc.text(`Tax Identification Number (TIN): ${data.company.tin}`, 20, yPos);
    yPos += 6;
    doc.text(`Address: ${data.company.address}`, 20, yPos);

    // Income Summary
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. INCOME TAX DETAILS', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Revenue (Paid Invoices): LKR ${data.income.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 6;
    doc.text(`Number of Invoices: ${data.income.paidInvoices.length}`, 20, yPos);

    // VAT Summary
    yPos += 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. VALUE ADDED TAX (VAT) DETAILS', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`VAT Collected (Output Tax): LKR ${data.vat.totalVATCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 6;
    doc.text(`VAT Paid (Input Tax): LKR ${data.vat.totalVATPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 6;
    const netVAT = data.vat.totalVATCollected - data.vat.totalVATPaid;
    doc.text(`Net VAT Payable: LKR ${netVAT.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);

    // Expenses Summary
    yPos += 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3. BUSINESS EXPENSES', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Approved Expenses: LKR ${data.expenses.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 6;
    doc.text(`Number of Expense Claims: ${data.expenses.approvedExpenses.length}`, 20, yPos);

    // Payroll Tax Summary
    yPos += 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4. PAYROLL TAX BREAKDOWN', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Number of Employees Paid: ${data.payroll.payrollEntries.length}`, 20, yPos);
    yPos += 6;
    doc.text(`Total Gross Salary (Basic + Allowances): LKR ${data.payroll.totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Statutory Contributions (calculated on Basic Salary):', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`  EPF - Employee Share (8%): LKR ${data.payroll.totalEPFEmployee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 5;
    doc.text(`  EPF - Employer Share (12%): LKR ${data.payroll.totalEPFEmployer.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 5;
    doc.text(`  ETF - Employer Share (3%): LKR ${data.payroll.totalETF.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Tax Withholdings (calculated on Gross Salary):', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`  APIT - Employee Withholding: LKR ${data.payroll.totalAPIT_Employee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 5;
    doc.text(`  APIT - Employer Payment (Scenario B): LKR ${data.payroll.totalAPIT_Employer.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`  APIT - Total: LKR ${data.payroll.totalAPIT.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`  Stamp Fee: LKR ${data.payroll.totalStampFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);

    // Total Tax Obligations
    yPos += 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('5. TOTAL TAX OBLIGATIONS TO GOVERNMENT', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // EPF Total (Employee + Employer)
    const totalEPF = data.payroll.totalEPFEmployee + data.payroll.totalEPFEmployer;
    doc.text(`EPF - Total to remit (Employee 8% + Employer 12%): LKR ${totalEPF.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 6;
    
    // ETF Total
    doc.text(`ETF - Employer Contribution (3%): LKR ${data.payroll.totalETF.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 6;
    
    // APIT Total - Only employer portion is remitted by employer
    doc.text(`APIT - Employer to remit: LKR ${data.payroll.totalAPIT_Employer.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 6;
    
    // Stamp Fee
    doc.text(`Stamp Fee: LKR ${data.payroll.totalStampFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 6;
    
    // VAT
    doc.text(`Net VAT Payable: LKR ${netVAT.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 8;
    
    // Grand Total - Only employer portions
    const totalTaxPayable = totalEPF + data.payroll.totalETF + data.payroll.totalAPIT_Employer + data.payroll.totalStampFee + netVAT;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL AMOUNT PAYABLE TO ALL AUTHORITIES: LKR ${totalTaxPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);

    // Supporting Documents
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPORTING DOCUMENTS SUMMARY', 20, yPos);

    yPos += 12;
    doc.setFontSize(12);
    doc.text('Invoices (Paid):', 20, yPos);
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    data.income.paidInvoices.forEach((inv: any, idx: number) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const description = inv.lines?.[0]?.description || inv.client?.name || 'Initial Balance';
      doc.text(`${idx + 1}. ${inv.serialNumber} - ${description} - LKR ${inv.total.toLocaleString()} - ${new Date(inv.issueDate).toLocaleDateString()}`, 25, yPos);
      yPos += 5;
      if (inv.attachmentUrl) {
        doc.text(`   Attachment: ${inv.attachmentUrl}`, 25, yPos);
        yPos += 5;
      }
      if (inv.receiptUrl) {
        doc.text(`   Receipt: ${inv.receiptUrl}`, 25, yPos);
        yPos += 5;
      }
    });

    yPos += 10;
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Expenses (Approved):', 20, yPos);
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    data.expenses.approvedExpenses.forEach((exp: any, idx: number) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${idx + 1}. ${exp.serialNumber} - ${exp.description} - ${exp.category} - LKR ${exp.amount.toLocaleString()} - ${new Date(exp.date).toLocaleDateString()}`, 25, yPos);
      yPos += 5;
      if (exp.billUrl) {
        doc.text(`   Bill: ${exp.billUrl}`, 25, yPos);
        yPos += 5;
      }
      if (exp.receiptUrl) {
        doc.text(`   Receipt: ${exp.receiptUrl}`, 25, yPos);
        yPos += 5;
      }
    });

    // Compliance Notes
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPLIANCE NOTES', 20, yPos);
    
    yPos += 12;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('This report has been prepared in accordance with the requirements of:', 20, yPos);
    yPos += 8;
    doc.text('- Inland Revenue Act No. 24 of 2017 (as amended)', 25, yPos);
    yPos += 6;
    doc.text('- Value Added Tax Act No. 14 of 2002 (as amended)', 25, yPos);
    yPos += 6;
    doc.text('- Employees\' Provident Fund Act', 25, yPos);
    yPos += 6;
    doc.text('- Employees\' Trust Fund Act', 25, yPos);
    
    yPos += 12;
    doc.setFont('helvetica', 'bold');
    doc.text('Important Notes:', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('1. EPF payments include both employee deductions (8%) and employer contributions (12%)', 25, yPos);
    yPos += 5;
    doc.text('   Total to be remitted to EPF: Employee share + Employer share', 25, yPos);
    yPos += 6;
    doc.text('2. ETF is 3% employer contribution calculated on basic salary only', 25, yPos);
    yPos += 6;
    doc.text('3. APIT breakdown:', 25, yPos);
    yPos += 5;
    doc.text('   - Employee Withholding: Deducted from employee salary (Scenario A)', 25, yPos);
    yPos += 5;
    doc.text('   - Employer Payment: Paid by employer on behalf of employee (Scenario B)', 25, yPos);
    yPos += 5;
    doc.text('   - Total APIT remitted to IRD = Employee Withholding + Employer Payment', 25, yPos);
    yPos += 6;
    doc.text('4. All supporting documents are available for inspection upon request', 25, yPos);
    
    yPos += 10;
    doc.text('Submit this report to the Inland Revenue Department via:', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Online Portal: https://www.ird.gov.lk/en/eservices/', 25, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('Or nearest IRD office with all supporting documents', 25, yPos);

    yPos += 12;
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 20, yPos);

    // Save PDF
    const filename = `Tax_Report_${companyTIN}_${startDate}_to_${endDate}.pdf`;
    doc.save(filename);
    
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="text-blue-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tax Report Generator</h1>
            <p className="text-gray-600 text-sm">Generate comprehensive tax reports for Sri Lanka IRD submission</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-2">This report includes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Income Tax calculations based on paid invoices</li>
                <li>VAT (Value Added Tax) collected and paid</li>
                <li>Payroll tax obligations (EPF, ETF, APIT, Stamp Fee)</li>
                <li>Business expenses with supporting documentation</li>
                <li>Complete list of all invoices, receipts, and bills</li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Identification Number (TIN) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyTIN}
              onChange={(e) => setCompanyTIN(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter TIN"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Address
            </label>
            <input
              type="text"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter company address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <button
          onClick={generatePDF}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={20} />
          {loading ? 'Generating Report...' : 'Generate Tax Report (PDF)'}
        </button>

        <div className="mt-6 text-sm text-gray-600">
          <p className="font-semibold mb-2">After generating the report:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Review the PDF document carefully</li>
            <li>Gather all physical copies of supporting documents</li>
            <li>Submit to IRD via online portal: <a href="https://www.ird.gov.lk/en/eservices/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://www.ird.gov.lk/en/eservices/</a></li>
            <li>Keep a copy for your records</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
