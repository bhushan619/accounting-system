import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Section {
  title: string;
  content: string;
}

const sections: Section[] = [
  {
    title: 'Getting Started',
    content: 'Welcome to VeloSync! This comprehensive accounting system helps you manage all financial operations including clients, invoices, expenses, payroll, and reporting. Use the navigation menu to access different modules based on your role permissions.'
  },
  {
    title: 'Managing Clients',
    content: 'Create and manage client records with complete contact information including name, email, phone, address, and tax ID. Navigate to Clients page to add new clients, edit existing records, or delete clients no longer needed. Client records are used when creating invoices.'
  },
  {
    title: 'Managing Vendors',
    content: 'Maintain vendor records for all suppliers and service providers. Add vendor details including name, contact person, email, phone, and address. Vendors can be linked to expenses for better expense tracking and reporting.'
  },
  {
    title: 'Bank Accounts',
    content: 'Set up and manage multiple bank accounts with account numbers, bank names, and branch details. Track opening balances (set only during creation). When a bank account is created with an initial balance, it is recorded as an income transaction with description "Initial balance ([accountNumber])". Bank balances are automatically updated when processing invoices, expenses, and payroll. View all bank transactions including debits and credits in the Transactions page.'
  },
  {
    title: 'Creating Invoices',
    content: 'Generate professional invoices with automatic serial numbers (INV-XXXX). Add multiple line items with descriptions, quantities, rates, and tax percentages. Attach supporting documents like quotations and receipts. When marking an invoice as paid, select the bank account to credit - the system automatically updates the bank balance. Invoice descriptions in reports display the first line item description or client name.'
  },
  {
    title: 'Tracking Expenses',
    content: 'Record business expenses with automatic serial numbers (EXP-XXXX). Categorize expenses, link to vendors, specify payment method (cash/bank/card), and upload bills and receipts. When approving expenses with bank payment, select the bank account - the balance is automatically debited. All approved expenses appear in financial reports with proper descriptions.'
  },
  {
    title: 'Employee Management (Admin Only)',
    content: 'Manage employee records including personal details, employment information, and salary components. Set basic salary and allowances. EPF rates (employee and employer) and ETF rate are automatically populated from active tax configurations and displayed as read-only labels. Set the APIT scenario for each employee: Scenario A (employee pays APIT tax) or Scenario B (employer pays APIT tax). Employee records are used for payroll processing.'
  },
  {
    title: 'Payroll Processing (Admin Only)',
    content: 'Process payroll for multiple employees in bulk. Select employees and preview calculations before processing. In the preview, you can edit two income components separately: "Allowances" (regular monthly allowances) and "Performance Bonus" (one-time bonuses). Both are added to basic salary to calculate gross salary. Payroll includes EPF (8% employee, 12% employer on basic salary), ETF (3% on basic salary), APIT (calculated on gross salary using slab system based on employee scenario), and stamp fees. When processing payroll, select a bank account - net salaries are automatically debited. Processed payroll appears in Transactions and Financial Reports.'
  },
  {
    title: 'APIT Scenarios Explained',
    content: 'APIT (Advance Personal Income Tax) is calculated once per employee using slab-based tax brackets with standard deductions. The single APIT amount is then assigned based on the employee\'s scenario: Scenario A - Employee pays APIT (deducted from salary, reducing net pay), Scenario B - Employer pays APIT (added to employer costs, not deducted from salary). In Scenario B, APIT appears only in employer costs section, not in employee deductions. Sri Lanka tax slabs: 0-150K LKR (0%), 150K-250K (6%), 250K-323K (12%), 323K+ (56.25% with standard deduction).'
  },
  {
    title: 'Tax Configuration (Admin Only)',
    content: 'Configure tax rates including EPF employee rate, EPF employer rate, ETF rate, and stamp fee. These configurations are automatically applied when adding new employees - the rates appear as read-only labels in the employee modal. Tax configurations apply to all payroll calculations unless employee has custom rates.'
  },
  {
    title: 'Tax Reports',
    content: 'Generate tax compliance reports for submission to the Inland Revenue Department. Reports include: gross income from paid invoices, total expenses from approved items, APIT deductions (showing only employer responsibility for remittance), and payroll statutory contributions. Payroll expenses are displayed in a dedicated section separate from regular expenses. Reports can be filtered by date range and exported to PDF.'
  },
  {
    title: 'Transactions Tracking',
    content: 'View all financial transactions in one place with two tabs: All Transactions shows invoices (with serial number descriptions), expenses, and payroll summary. Bank Transactions tab displays all bank debits and credits with details including transaction type, bank account, date, category, description, and amount. Filter and track cash flow across all bank accounts.'
  },
  {
    title: 'Financial Reports',
    content: 'Access three comprehensive report views: Overview (total income, expenses, profit), Profit & Loss Statement (detailed income vs expenses breakdown including payroll statutory contributions like EPF, ETF, and employer APIT), and Expenses Breakdown (category-wise expense analysis with charts showing payroll in dedicated section). Reports include only confirmed transactions: paid invoices, approved expenses, and processed payroll. Export reports to PDF or Excel.'
  },
  {
    title: 'User Management (Admin Only)',
    content: 'Manage system users with role-based access control. Create users with Admin or Accountant roles. Admin users have full access to all features. Accountant users have restricted access and cannot view/manage: Users, Tax Configurations, Employees, and Payroll modules.'
  },
  {
    title: 'File Attachments',
    content: 'Upload supporting documents for invoices (attachments and receipts) and expenses (bills and receipts). Files are stored securely in the local filesystem. When deleting invoices or expenses, associated files are automatically removed from storage.'
  },
  {
    title: 'Audit Logs',
    content: 'All create, update, and delete operations are automatically logged with user information and timestamps. Audit logs help track changes and maintain accountability across the system.'
  }
];

export default function Guide() {
  const { t } = useLanguage();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">{t('guide.title')}</h1>

      <div className="bg-card rounded-lg shadow border border-border">
        {sections.map((section, index) => (
          <div key={index} className="border-b border-border last:border-b-0">
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <span className="font-semibold text-lg text-foreground">{section.title}</span>
              {expandedIndex === index ? (
                <ChevronUp className="text-muted-foreground" />
              ) : (
                <ChevronDown className="text-muted-foreground" />
              )}
            </button>
            {expandedIndex === index && (
              <div className="px-6 pb-4">
                <p className="text-muted-foreground">{section.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
