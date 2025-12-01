import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'zh';

export interface Translations {
  [key: string]: string;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translations: Record<Language, Translations>;
  updateTranslation: (lang: Language, key: string, value: string) => void;
}

const defaultTranslations: Record<Language, Translations> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.masters': 'Masters',
    'nav.clients': 'Clients',
    'nav.vendors': 'Vendors',
    'nav.banks': 'Banks',
    'nav.taxConfig': 'Tax Config',
    'nav.bookkeeping': 'Bookkeeping',
    'nav.invoices': 'Invoices',
    'nav.expenses': 'Expenses',
    'nav.transactions': 'Transactions',
    'nav.financialReports': 'Financial Reports',
    'nav.taxReports': 'Tax Reports (IRD)',
    'nav.salary': 'Salary',
    'nav.employees': 'Employees',
    'nav.payroll': 'Payroll',
    'nav.users': 'Users',
    'nav.userGuide': 'User Guide',
    'nav.translations': 'Translations',
    'nav.signOut': 'Sign Out',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.loading': 'Loading...',
    'common.noData': 'No data available',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.amount': 'Amount',
    'common.description': 'Description',
    'common.name': 'Name',
    'common.email': 'Email',
    'common.phone': 'Phone',
    'common.address': 'Address',
    'common.submit': 'Submit',
    'common.reset': 'Reset',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.yes': 'Yes',
    'common.no': 'No',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.totalRevenue': 'Total Revenue',
    'dashboard.totalExpenses': 'Total Expenses',
    'dashboard.netProfit': 'Net Profit',
    'dashboard.pendingInvoices': 'Pending Invoices',
    'dashboard.payroll': 'Payroll',
    'dashboard.recentTransactions': 'Recent Transactions',
    'dashboard.fromDate': 'From Date',
    'dashboard.toDate': 'To Date',
    
    // Clients
    'clients.title': 'Clients',
    'clients.addClient': 'Add Client',
    'clients.editClient': 'Edit Client',
    'clients.clientName': 'Client Name',
    'clients.contactPerson': 'Contact Person',
    
    // Vendors
    'vendors.title': 'Vendors',
    'vendors.addVendor': 'Add Vendor',
    'vendors.editVendor': 'Edit Vendor',
    'vendors.vendorName': 'Vendor Name',
    
    // Banks
    'banks.title': 'Banks',
    'banks.addBank': 'Add Bank',
    'banks.editBank': 'Edit Bank',
    'banks.bankName': 'Bank Name',
    'banks.accountNumber': 'Account Number',
    'banks.balance': 'Balance',
    
    // Invoices
    'invoices.title': 'Invoices',
    'invoices.addInvoice': 'Add Invoice',
    'invoices.editInvoice': 'Edit Invoice',
    'invoices.invoiceNumber': 'Invoice Number',
    'invoices.client': 'Client',
    'invoices.dueDate': 'Due Date',
    'invoices.paid': 'Paid',
    'invoices.pending': 'Pending',
    'invoices.draft': 'Draft',
    
    // Expenses
    'expenses.title': 'Expenses',
    'expenses.addExpense': 'Add Expense',
    'expenses.editExpense': 'Edit Expense',
    'expenses.category': 'Category',
    'expenses.vendor': 'Vendor',
    'expenses.approved': 'Approved',
    'expenses.pending': 'Pending',
    
    // Employees
    'employees.title': 'Employees',
    'employees.addEmployee': 'Add Employee',
    'employees.editEmployee': 'Edit Employee',
    'employees.employeeName': 'Employee Name',
    'employees.designation': 'Designation',
    'employees.basicSalary': 'Basic Salary',
    'employees.epfNo': 'EPF No',
    
    // Payroll
    'payroll.title': 'Payroll',
    'payroll.generatePayroll': 'Generate Payroll',
    'payroll.processPayroll': 'Process Payroll',
    'payroll.payrollRuns': 'Payroll Runs',
    'payroll.month': 'Month',
    'payroll.year': 'Year',
    'payroll.grossSalary': 'Gross Salary',
    'payroll.netSalary': 'Net Salary',
    'payroll.deductions': 'Deductions',
    'payroll.allowances': 'Allowances',
    'payroll.performanceBonus': 'Performance Bonus',
    
    // Users
    'users.title': 'User Management',
    'users.addUser': 'Add User',
    'users.editUser': 'Edit User',
    'users.fullName': 'Full Name',
    'users.role': 'Role',
    'users.admin': 'Admin',
    'users.accountant': 'Accountant',
    
    // Reports
    'reports.title': 'Financial Reports',
    'reports.overview': 'Overview',
    'reports.profitLoss': 'Profit & Loss',
    'reports.expenseBreakdown': 'Expense Breakdown',
    'reports.generate': 'Generate',
    
    // Tax Reports
    'taxReports.title': 'Tax Reports (IRD)',
    'taxReports.generateReport': 'Generate Report',
    'taxReports.dateRange': 'Date Range',
    
    // Translations
    'translations.title': 'Translation Management',
    'translations.key': 'Key',
    'translations.english': 'English',
    'translations.chinese': 'Chinese (Simplified)',
    'translations.searchPlaceholder': 'Search translations...',
    'translations.saveChanges': 'Save Changes',
    'translations.resetToDefault': 'Reset to Default',
    'translations.saved': 'Translations saved successfully',
    'translations.language': 'Language',
    
    // Login
    'login.title': 'Sign In',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.signIn': 'Sign In',
    'login.forgotPassword': 'Forgot Password?',
  },
  zh: {
    // Navigation
    'nav.dashboard': '仪表板',
    'nav.masters': '主数据',
    'nav.clients': '客户',
    'nav.vendors': '供应商',
    'nav.banks': '银行',
    'nav.taxConfig': '税务配置',
    'nav.bookkeeping': '记账',
    'nav.invoices': '发票',
    'nav.expenses': '费用',
    'nav.transactions': '交易',
    'nav.financialReports': '财务报告',
    'nav.taxReports': '税务报告',
    'nav.salary': '工资',
    'nav.employees': '员工',
    'nav.payroll': '工资单',
    'nav.users': '用户',
    'nav.userGuide': '用户指南',
    'nav.translations': '翻译管理',
    'nav.signOut': '退出登录',
    
    // Common
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.add': '添加',
    'common.search': '搜索',
    'common.filter': '筛选',
    'common.export': '导出',
    'common.import': '导入',
    'common.loading': '加载中...',
    'common.noData': '暂无数据',
    'common.actions': '操作',
    'common.status': '状态',
    'common.date': '日期',
    'common.amount': '金额',
    'common.description': '描述',
    'common.name': '名称',
    'common.email': '邮箱',
    'common.phone': '电话',
    'common.address': '地址',
    'common.submit': '提交',
    'common.reset': '重置',
    'common.confirm': '确认',
    'common.close': '关闭',
    'common.yes': '是',
    'common.no': '否',
    
    // Dashboard
    'dashboard.title': '仪表板',
    'dashboard.totalRevenue': '总收入',
    'dashboard.totalExpenses': '总支出',
    'dashboard.netProfit': '净利润',
    'dashboard.pendingInvoices': '待处理发票',
    'dashboard.payroll': '工资支出',
    'dashboard.recentTransactions': '最近交易',
    'dashboard.fromDate': '开始日期',
    'dashboard.toDate': '结束日期',
    
    // Clients
    'clients.title': '客户管理',
    'clients.addClient': '添加客户',
    'clients.editClient': '编辑客户',
    'clients.clientName': '客户名称',
    'clients.contactPerson': '联系人',
    
    // Vendors
    'vendors.title': '供应商管理',
    'vendors.addVendor': '添加供应商',
    'vendors.editVendor': '编辑供应商',
    'vendors.vendorName': '供应商名称',
    
    // Banks
    'banks.title': '银行管理',
    'banks.addBank': '添加银行',
    'banks.editBank': '编辑银行',
    'banks.bankName': '银行名称',
    'banks.accountNumber': '账户号码',
    'banks.balance': '余额',
    
    // Invoices
    'invoices.title': '发票管理',
    'invoices.addInvoice': '添加发票',
    'invoices.editInvoice': '编辑发票',
    'invoices.invoiceNumber': '发票号码',
    'invoices.client': '客户',
    'invoices.dueDate': '到期日',
    'invoices.paid': '已付款',
    'invoices.pending': '待处理',
    'invoices.draft': '草稿',
    
    // Expenses
    'expenses.title': '费用管理',
    'expenses.addExpense': '添加费用',
    'expenses.editExpense': '编辑费用',
    'expenses.category': '类别',
    'expenses.vendor': '供应商',
    'expenses.approved': '已批准',
    'expenses.pending': '待处理',
    
    // Employees
    'employees.title': '员工管理',
    'employees.addEmployee': '添加员工',
    'employees.editEmployee': '编辑员工',
    'employees.employeeName': '员工姓名',
    'employees.designation': '职位',
    'employees.basicSalary': '基本工资',
    'employees.epfNo': '公积金号',
    
    // Payroll
    'payroll.title': '工资管理',
    'payroll.generatePayroll': '生成工资单',
    'payroll.processPayroll': '处理工资',
    'payroll.payrollRuns': '工资记录',
    'payroll.month': '月份',
    'payroll.year': '年份',
    'payroll.grossSalary': '总工资',
    'payroll.netSalary': '净工资',
    'payroll.deductions': '扣除',
    'payroll.allowances': '津贴',
    'payroll.performanceBonus': '绩效奖金',
    
    // Users
    'users.title': '用户管理',
    'users.addUser': '添加用户',
    'users.editUser': '编辑用户',
    'users.fullName': '全名',
    'users.role': '角色',
    'users.admin': '管理员',
    'users.accountant': '会计',
    
    // Reports
    'reports.title': '财务报告',
    'reports.overview': '概览',
    'reports.profitLoss': '损益表',
    'reports.expenseBreakdown': '费用明细',
    'reports.generate': '生成',
    
    // Tax Reports
    'taxReports.title': '税务报告',
    'taxReports.generateReport': '生成报告',
    'taxReports.dateRange': '日期范围',
    
    // Translations
    'translations.title': '翻译管理',
    'translations.key': '键',
    'translations.english': '英语',
    'translations.chinese': '中文（简体）',
    'translations.searchPlaceholder': '搜索翻译...',
    'translations.saveChanges': '保存更改',
    'translations.resetToDefault': '重置为默认',
    'translations.saved': '翻译保存成功',
    'translations.language': '语言',
    
    // Login
    'login.title': '登录',
    'login.email': '邮箱',
    'login.password': '密码',
    'login.signIn': '登录',
    'login.forgotPassword': '忘记密码？',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });
  
  const [translations, setTranslations] = useState<Record<Language, Translations>>(() => {
    const saved = localStorage.getItem('translations');
    return saved ? JSON.parse(saved) : defaultTranslations;
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('translations', JSON.stringify(translations));
  }, [translations]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const updateTranslation = (lang: Language, key: string, value: string) => {
    setTranslations(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [key]: value
      }
    }));
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations, updateTranslation }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export { defaultTranslations };
