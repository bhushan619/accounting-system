import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface GuideSection {
  titleKey: string;
  contentKey: string;
  steps: string[];
}

export default function Guide() {
  const { t } = useLanguage();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const sections: GuideSection[] = [
    {
      titleKey: 'guide.gettingStarted',
      contentKey: 'guide.gettingStartedContent',
      steps: [
        'Log in with your credentials at the login page.',
        'Use the sidebar navigation to access different modules based on your role.',
        'Admins can access all modules; Accountants have limited access; Employees see only the Employee Portal.',
        'Configure company settings first via Settings → Company & Branding.',
        'Seed default tax configurations via Tax Configurations → Seed Default Configs.',
      ],
    },
    {
      titleKey: 'guide.managingClients',
      contentKey: 'guide.managingClientsContent',
      steps: [
        'Navigate to Masters → Clients from the sidebar.',
        'Click "Add Client" to open the client form.',
        'Fill in client name, contact person, email, phone, address, and tax ID.',
        'Click Save to create the client record.',
        'To edit, click the edit icon on any client row.',
        'To delete a client, click the delete icon (this cannot be undone).',
      ],
    },
    {
      titleKey: 'guide.managingVendors',
      contentKey: 'guide.managingVendorsContent',
      steps: [
        'Navigate to Masters → Vendors from the sidebar.',
        'Click "Add Vendor" to open the vendor form.',
        'Enter vendor name, contact person, email, phone, address, and tax ID.',
        'Save the vendor record.',
        'Link vendors to expenses for better expense tracking.',
        'Edit or delete vendor records using the action icons.',
      ],
    },
    {
      titleKey: 'guide.bankAccounts',
      contentKey: 'guide.bankAccountsContent',
      steps: [
        'Navigate to Masters → Banks from the sidebar.',
        'Click "Add Bank Account" and fill in bank name, account name, account number, branch, and opening balance.',
        'The opening balance is recorded as an income transaction automatically.',
        'Bank balances update automatically when invoices are paid or expenses are approved.',
        'To edit a bank account, click the edit icon (note: balance is read-only after creation).',
      ],
    },
    {
      titleKey: 'guide.creatingInvoices',
      contentKey: 'guide.creatingInvoicesContent',
      steps: [
        'Navigate to Bookkeeping → Invoices from the sidebar.',
        'Click "Add Invoice" to open the invoice form.',
        'Select a client, set the issue date, due date, and currency.',
        'Add line items with description, quantity, rate, tax %, and discount.',
        'Attach supporting documents (quotations, receipts) if needed.',
        'Save as Draft, or submit for approval.',
        'To mark as paid, click the paid icon and select the bank account to credit.',
      ],
    },
    {
      titleKey: 'guide.trackingExpenses',
      contentKey: 'guide.trackingExpensesContent',
      steps: [
        'Navigate to Bookkeeping → Expenses from the sidebar.',
        'Click "Add Expense" and fill in category, vendor, amount, currency, date, and payment method.',
        'Upload bills or receipts as attachments.',
        'For bank payments, select the bank account to debit.',
        'Submit the expense; accountant-created expenses require admin approval.',
        'Admin-created expenses are auto-approved.',
      ],
    },
    {
      titleKey: 'guide.employeeManagement',
      contentKey: 'guide.employeeManagementContent',
      steps: [
        'Navigate to Salary → Employees (Admin only).',
        'Click "Add Employee" and fill in personal details, employment info, department, and designation.',
        'Set basic salary, transport allowance, and other allowances.',
        'EPF and ETF rates are auto-populated from active tax configurations.',
        'Set the APIT scenario (A or B) per employee.',
        'Save the employee record. An Employee ID is generated automatically.',
      ],
    },
    {
      titleKey: 'guide.employeePortal',
      contentKey: 'guide.employeePortalContent',
      steps: [
        'Employees log in via the Employee Login page (link on main login).',
        'After login, the Employee Portal is displayed automatically.',
        'View personal profile details under "My Profile".',
        'Browse payslips and download PDFs under "My Payslips".',
        'Submit expense claims under "Expense Claims".',
        'Request profile updates; changes require admin approval.',
      ],
    },
    {
      titleKey: 'guide.employeeLogin',
      contentKey: 'guide.employeeLoginContent',
      steps: [
        'On the main login page, click the "Employee Portal" link.',
        'To self-register, click "Register" and enter your Employee ID and email.',
        'Alternatively, an admin can create the account and link it to your employee record.',
        'Log in with your email and password to access the Employee Portal.',
        'Employees are restricted to the Employee Portal; they cannot access admin modules.',
      ],
    },
    {
      titleKey: 'guide.expenseClaims',
      contentKey: 'guide.expenseClaimsContent',
      steps: [
        'Log in to the Employee Portal.',
        'Click "Expense Claims" and then "New Claim".',
        'Fill in category, description, amount, currency, and date.',
        'Optionally attach a receipt image.',
        'Submit the claim; it is assigned an ECL-XXXX serial number.',
        'Track the status (Pending / Approved / Rejected) in the claims list.',
        'Admins can review and approve/reject claims from the Approvals page.',
      ],
    },
    {
      titleKey: 'guide.payrollProcessing',
      contentKey: 'guide.payrollProcessingContent',
      steps: [
        'Navigate to Salary → Payroll.',
        'Select the payroll month and year.',
        'Upload the attendance Excel file (download the template first).',
        'Click "Preview Payroll" to review calculations per employee.',
        'In preview, adjust allowances or performance bonuses if needed.',
        'Submit for approval (accountants) or process directly (admins).',
        'Processed payroll creates expense records and updates bank balances.',
      ],
    },
    {
      titleKey: 'guide.payrollApprovalWorkflow',
      contentKey: 'guide.payrollApprovalWorkflowContent',
      steps: [
        'Accountant creates a payroll run; it enters "Pending Approval" status.',
        'Admin navigates to Approvals page and reviews the payroll run.',
        'Admin clicks Approve or Reject with a reason.',
        'Once approved, admin or accountant can process the payroll.',
        'Processing creates statutory expense records and updates bank balances.',
      ],
    },
    {
      titleKey: 'guide.attendanceTracking',
      contentKey: 'guide.attendanceTrackingContent',
      steps: [
        'On the Payroll page, click "Download Template" to get the attendance Excel file.',
        'Fill in Employee ID, Name, Working Days, Attended Days, and leave types.',
        'Use 0.5 for half-days in the Days Attended column.',
        'Upload the completed file using the "Upload Attendance File" button.',
        'Review loaded attendance data and any warnings shown.',
        'Proceed to preview and process payroll.',
      ],
    },
    {
      titleKey: 'guide.apitScenarios',
      contentKey: 'guide.apitScenariosContent',
      steps: [
        'APIT (Advance Personal Income Tax) is calculated using slab-based tax brackets.',
        'Scenario A: Employee pays APIT — the tax amount is deducted from the employee\'s net salary.',
        'Scenario B: Employer pays APIT — the tax amount is added to employer costs, net salary is unaffected.',
        'Set the APIT scenario per employee in the Employee record.',
        'APIT is calculated once per payroll run per employee.',
      ],
    },
    {
      titleKey: 'guide.taxConfiguration',
      contentKey: 'guide.taxConfigurationContent',
      steps: [
        'Navigate to Masters → Tax Config (Admin only).',
        'Click "Seed Default Configs" to load Sri Lankan tax defaults.',
        'Review or add configurations for EPF (employee & employer), ETF, and stamp fee.',
        'Set applicable from/to dates for each configuration.',
        'Mark configurations as Active or Inactive.',
        'These rates are auto-applied when adding new employees.',
      ],
    },
    {
      titleKey: 'guide.taxReports',
      contentKey: 'guide.taxReportsContent',
      steps: [
        'Navigate to Bookkeeping → Tax Reports (IRD).',
        'Company name, TIN, and address are auto-filled from Settings.',
        'Select the reporting period (start date and end date).',
        'Click "Generate Report" to compute the tax figures.',
        'Review gross income, total expenses, APIT deductions, and payroll contributions.',
        'Click "Download Tax Report PDF" to save the report for IRD submission.',
      ],
    },
    {
      titleKey: 'guide.vatFiling',
      contentKey: 'guide.vatFilingContent',
      steps: [
        'Navigate to Bookkeeping → VAT Reports.',
        'Select the reporting period.',
        'The system calculates Output VAT from paid invoices and Input VAT from approved expenses.',
        'Review the IRD VAT Return Summary (Box 1–6).',
        'Download the VAT return PDF for submission to the Inland Revenue Department.',
      ],
    },
    {
      titleKey: 'guide.transactionsTracking',
      contentKey: 'guide.transactionsTrackingContent',
      steps: [
        'Navigate to Bookkeeping → Transactions.',
        'Use the "All Transactions" tab to see invoices, expenses, and payroll in one view.',
        'Use the "Bank Transactions" tab to view all bank debits and credits.',
        'Filter by date range using the date pickers.',
        'Toggle the display currency between LKR and AED as needed.',
        'Export transactions to Excel using the Export button.',
      ],
    },
    {
      titleKey: 'guide.financialReports',
      contentKey: 'guide.financialReportsContent',
      steps: [
        'Navigate to Bookkeeping → Financial Reports.',
        'Choose from Overview, Profit & Loss, or Expenses Breakdown.',
        'Set the start and end date for the reporting period.',
        'Click Generate to load the report.',
        'Toggle between LKR and AED to view amounts in your preferred currency.',
        'Reports include only confirmed (approved/paid) transactions.',
      ],
    },
    {
      titleKey: 'guide.multiCurrency',
      contentKey: 'guide.multiCurrencyContent',
      steps: [
        'The system supports LKR (Sri Lankan Rupee) and AED (UAE Dirham).',
        'Configure exchange rates under Settings → Currency tab.',
        'When creating an invoice or expense, select the currency from the dropdown.',
        'In Reports and Transactions, use the currency toggle to switch display currency.',
        'Amounts are automatically converted using the configured exchange rates.',
      ],
    },
    {
      titleKey: 'guide.approvalWorkflows',
      contentKey: 'guide.approvalWorkflowsContent',
      steps: [
        'Invoices and expenses created by accountants are submitted for approval.',
        'Admin-created transactions are auto-approved (if the setting is enabled).',
        'Navigate to Bookkeeping → Approvals (Admin only) to review pending items.',
        'Click Approve or Reject; provide a rejection reason if rejecting.',
        'Approved invoices/expenses are processed and bank balances are updated.',
        'Payroll runs by accountants also follow this approval workflow.',
      ],
    },
    {
      titleKey: 'guide.userManagement',
      contentKey: 'guide.userManagementContent',
      steps: [
        'Navigate to Users (Admin only).',
        'New sign-ups appear as "Unmarked" until a role is assigned.',
        'Click the edit icon on a user to assign a role: Admin, Accountant, or Employee.',
        'For employee users, link their account to an employee record using the "Link to Employee" dropdown.',
        'To add a new user manually, click "Add User" and fill in the form.',
        'Delete users who no longer need access.',
      ],
    },
    {
      titleKey: 'guide.rolePermissions',
      contentKey: 'guide.rolePermissionsContent',
      steps: [
        'Navigate to Users → Role Permissions section.',
        'Select a role (Admin, Accountant, or Employee) to view its permissions.',
        'Click "Edit Permissions" to add or remove permissions.',
        'Type a custom permission name and click Add, or remove existing ones.',
        'Click "Reset to Defaults" to restore the default permission set for that role.',
        'Changes take effect immediately for all users of that role.',
      ],
    },
    {
      titleKey: 'guide.settingsPage',
      contentKey: 'guide.settingsPageContent',
      steps: [
        'Navigate to Settings from the sidebar.',
        'Profile tab: Update your full name and change your password.',
        'Company & Branding tab (Admin): Set company name, address, phone, email, tax number, region, and fiscal year. Also configure brand name, tagline, logo, and theme colors.',
        'Defaults tab (Admin): Set default payment terms, invoice due days, stamp fee, and auto-approval preferences.',
        'Email tab (Admin): Configure SMTP settings or EmailJS credentials for sending payslips, invoices, and notifications.',
        'Currency tab (Admin): Set base currency, supported currencies, exchange rates, and VAT rates per region.',
      ],
    },
    {
      titleKey: 'guide.multiLanguage',
      contentKey: 'guide.multiLanguageContent',
      steps: [
        'Click the language switcher in the sidebar footer to toggle between English and Chinese.',
        'To manage translations, navigate to Translations (Admin only).',
        'Search for a translation key using the search bar.',
        'Edit the English or Chinese value inline.',
        'Click "Save Changes" to persist your translations.',
        'Click "Reset to Default" to restore original translations.',
      ],
    },
    {
      titleKey: 'guide.fileAttachments',
      contentKey: 'guide.fileAttachmentsContent',
      steps: [
        'When creating or editing an invoice, use the Attachment and Receipt upload fields.',
        'When creating or editing an expense, use the Bill and Receipt upload fields.',
        'Click the upload area or drag-and-drop a file to attach it.',
        'Uploaded files are stored securely on the server.',
        'View attached files by clicking the file icon on the record.',
        'Deleting an invoice or expense automatically removes all associated files.',
      ],
    },
    {
      titleKey: 'guide.auditLogs',
      contentKey: 'guide.auditLogsContent',
      steps: [
        'Audit logs are recorded automatically for all create, update, and delete operations.',
        'Access audit logs from the Settings or Admin panel (if exposed).',
        'Each log entry shows the action, affected record, user who performed it, and timestamp.',
        'Use audit logs to track changes and investigate discrepancies.',
        'Logs cannot be edited or deleted by users.',
      ],
    },
    {
      titleKey: 'guide.passwordRecovery',
      contentKey: 'guide.passwordRecoveryContent',
      steps: [
        'On the login page, click "Forgot Password?".',
        'Enter your registered email address and click "Send Reset Link".',
        'Check your inbox for the password reset email.',
        'Click the link in the email (expires in 1 hour).',
        'Enter and confirm your new password, then click "Reset Password".',
        'You are redirected to the login page. Use your new password to sign in.',
        'Alternatively, authenticated users can change their password in Settings → Profile.',
      ],
    },
    {
      titleKey: 'guide.dockerDeployment',
      contentKey: 'guide.dockerDeploymentContent',
      steps: [
        'Ensure Docker and Docker Compose are installed on your server.',
        'Clone the repository and navigate to the project root.',
        'Copy .env.example to .env and configure JWT_SECRET, MONGODB_URI, and ALLOWED_ORIGINS.',
        'Run: docker-compose up --build to start all three containers.',
        'Frontend is served by Nginx on port 8005; backend on port 4005; MongoDB on port 27005.',
        'For production, set a secure JWT_SECRET of at least 32 characters.',
        'Use docker-compose down to stop the services.',
      ],
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{t('guide.title')}</h1>
        <p className="page-description">{t('guide.description') || 'Learn how to use the system'}</p>
      </div>

      <div className="bg-card rounded-lg shadow border border-border">
        {sections.map((section, index) => (
          <div key={index} className="border-b border-border last:border-b-0">
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <span className="font-semibold text-lg text-foreground">{t(section.titleKey)}</span>
              {expandedIndex === index ? (
                <ChevronUp className="text-muted-foreground" />
              ) : (
                <ChevronDown className="text-muted-foreground" />
              )}
            </button>
            {expandedIndex === index && (
              <div className="px-6 pb-6">
                <p className="text-muted-foreground mb-4">{t(section.contentKey)}</p>
                <div className="space-y-2">
                  {section.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <span className="text-xs font-bold text-primary">{stepIndex + 1}</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
