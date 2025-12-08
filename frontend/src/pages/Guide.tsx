import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Guide() {
  const { t } = useLanguage();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const sections = [
    { titleKey: 'guide.gettingStarted', contentKey: 'guide.gettingStartedContent' },
    { titleKey: 'guide.managingClients', contentKey: 'guide.managingClientsContent' },
    { titleKey: 'guide.managingVendors', contentKey: 'guide.managingVendorsContent' },
    { titleKey: 'guide.bankAccounts', contentKey: 'guide.bankAccountsContent' },
    { titleKey: 'guide.creatingInvoices', contentKey: 'guide.creatingInvoicesContent' },
    { titleKey: 'guide.trackingExpenses', contentKey: 'guide.trackingExpensesContent' },
    { titleKey: 'guide.employeeManagement', contentKey: 'guide.employeeManagementContent' },
    { titleKey: 'guide.employeePortal', contentKey: 'guide.employeePortalContent' },
    { titleKey: 'guide.payrollProcessing', contentKey: 'guide.payrollProcessingContent' },
    { titleKey: 'guide.payrollApprovalWorkflow', contentKey: 'guide.payrollApprovalWorkflowContent' },
    { titleKey: 'guide.attendanceTracking', contentKey: 'guide.attendanceTrackingContent' },
    { titleKey: 'guide.apitScenarios', contentKey: 'guide.apitScenariosContent' },
    { titleKey: 'guide.taxConfiguration', contentKey: 'guide.taxConfigurationContent' },
    { titleKey: 'guide.taxReports', contentKey: 'guide.taxReportsContent' },
    { titleKey: 'guide.vatFiling', contentKey: 'guide.vatFilingContent' },
    { titleKey: 'guide.transactionsTracking', contentKey: 'guide.transactionsTrackingContent' },
    { titleKey: 'guide.financialReports', contentKey: 'guide.financialReportsContent' },
    { titleKey: 'guide.approvalWorkflows', contentKey: 'guide.approvalWorkflowsContent' },
    { titleKey: 'guide.userManagement', contentKey: 'guide.userManagementContent' },
    { titleKey: 'guide.rolePermissions', contentKey: 'guide.rolePermissionsContent' },
    { titleKey: 'guide.multiLanguage', contentKey: 'guide.multiLanguageContent' },
    { titleKey: 'guide.fileAttachments', contentKey: 'guide.fileAttachmentsContent' },
    { titleKey: 'guide.auditLogs', contentKey: 'guide.auditLogsContent' },
    { titleKey: 'guide.passwordRecovery', contentKey: 'guide.passwordRecoveryContent' },
  ];

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
              <span className="font-semibold text-lg text-foreground">{t(section.titleKey)}</span>
              {expandedIndex === index ? (
                <ChevronUp className="text-muted-foreground" />
              ) : (
                <ChevronDown className="text-muted-foreground" />
              )}
            </button>
            {expandedIndex === index && (
              <div className="px-6 pb-4">
                <p className="text-muted-foreground">{t(section.contentKey)}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
