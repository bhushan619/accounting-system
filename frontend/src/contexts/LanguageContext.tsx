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
    'common.clear': 'Clear',
    'common.apply': 'Apply',
    'common.applyFilter': 'Apply Filter',
    'common.filterByDate': 'Filter by Date',
    'common.startDate': 'Start Date',
    'common.endDate': 'End Date',
    'common.showing': 'Showing data from',
    'common.to': 'to',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': "Welcome back! Here's your financial overview.",
    'dashboard.totalRevenue': 'Total Revenue',
    'dashboard.totalExpenses': 'Total Expenses',
    'dashboard.netProfit': 'Net Profit',
    'dashboard.pendingInvoices': 'Pending Invoices',
    'dashboard.payroll': 'Payroll',
    'dashboard.recentTransactions': 'Recent Transactions',
    'dashboard.fromDate': 'From Date',
    'dashboard.toDate': 'To Date',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.financialSummary': 'Financial Summary',
    'dashboard.createInvoice': 'Create Invoice',
    'dashboard.createInvoiceDesc': 'Generate a new invoice for clients',
    'dashboard.recordExpense': 'Record Expense',
    'dashboard.recordExpenseDesc': 'Log a new business expense',
    'dashboard.processPayroll': 'Process Payroll',
    'dashboard.processPayrollDesc': 'Generate and manage employee payroll',
    'dashboard.viewReports': 'View Reports',
    'dashboard.viewReportsDesc': 'Analyze your financial data',
    'dashboard.revenue': 'Revenue',
    'dashboard.expenses': 'Expenses',
    
    // Clients
    'clients.title': 'Clients',
    'clients.description': 'Manage your client information',
    'clients.addClient': 'Add Client',
    'clients.editClient': 'Edit Client',
    'clients.clientName': 'Client Name',
    'clients.contactPerson': 'Contact Person',
    
    // Vendors
    'vendors.title': 'Vendors',
    'vendors.description': 'Manage your vendor information',
    'vendors.addVendor': 'Add Vendor',
    'vendors.editVendor': 'Edit Vendor',
    'vendors.vendorName': 'Vendor Name',
    
    // Banks
    'banks.title': 'Bank Accounts',
    'banks.addBank': 'Add Bank Account',
    'banks.editBank': 'Edit Bank Account',
    'banks.bankName': 'Bank Name',
    'banks.accountName': 'Account Name',
    'banks.accountNumber': 'Account Number',
    'banks.branch': 'Branch',
    'banks.balance': 'Current Balance',
    'banks.balanceReadonly': 'Balance is readonly when editing. Update through transactions.',
    
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
    'invoices.files': 'Files',
    'invoices.createInvoice': 'Create Invoice',
    
    // Expenses
    'expenses.title': 'Expenses',
    'expenses.addExpense': 'Add Expense',
    'expenses.editExpense': 'Edit Expense',
    'expenses.category': 'Category',
    'expenses.vendor': 'Vendor',
    'expenses.approved': 'Approved',
    'expenses.pending': 'Pending',
    'expenses.expenseNo': 'Expense #',
    'expenses.files': 'Files',
    
    // Employees
    'employees.title': 'Employees',
    'employees.addEmployee': 'Add Employee',
    'employees.editEmployee': 'Edit Employee',
    'employees.employeeName': 'Employee Name',
    'employees.designation': 'Designation',
    'employees.basicSalary': 'Basic Salary',
    'employees.epfNo': 'EPF No',
    'employees.employeeId': 'Employee ID',
    'employees.department': 'Department',
    
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
    'users.passwordHint': 'leave blank to keep current',
    
    // Vendors
    'vendors.taxId': 'Tax ID',
    
    // Reports
    'reports.title': 'Financial Reports',
    'reports.overview': 'Overview',
    'reports.profitLoss': 'Profit & Loss',
    'reports.report': 'Report',
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
    'login.email': 'Email Address',
    'login.password': 'Password',
    'login.signIn': 'Sign In',
    'login.forgotPassword': 'Forgot Password?',
    'login.accounts': 'Accounts',
    'login.tagline1': 'Streamline Your',
    'login.tagline2': 'Financial Management',
    'login.description': 'Complete accountancy solution with invoicing, expenses, payroll, and tax compliance - all in one platform.',
    'login.createAccount': 'Create Account',
    'login.welcomeBack': 'Welcome Back',
    'login.signupSubtitle': 'Start managing your finances today',
    'login.loginSubtitle': 'Sign in to continue to your dashboard',
    'login.enterFullName': 'Enter your full name',
    'login.creatingAccount': 'Creating account...',
    'login.signingIn': 'Signing in...',
    'login.haveAccount': 'Already have an account?',
    'login.noAccount': "Don't have an account?",
    'login.signInInstead': 'Sign in instead',
    'login.createAccountLink': 'Create an account',
    'login.allRightsReserved': 'All rights reserved.',
    'login.loginFailed': 'Login failed. Please check your email and password.',
    'login.signupFailed': 'Signup failed. Please try again.',
    
    // Guide
    'guide.title': 'User Guide',
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
    'common.clear': '清除',
    'common.apply': '应用',
    'common.applyFilter': '应用筛选',
    'common.filterByDate': '按日期筛选',
    'common.startDate': '开始日期',
    'common.endDate': '结束日期',
    'common.showing': '显示数据从',
    'common.to': '至',
    
    // Dashboard
    'dashboard.title': '仪表板',
    'dashboard.welcome': '欢迎回来！这是您的财务概览。',
    'dashboard.totalRevenue': '总收入',
    'dashboard.totalExpenses': '总支出',
    'dashboard.netProfit': '净利润',
    'dashboard.pendingInvoices': '待处理发票',
    'dashboard.payroll': '工资支出',
    'dashboard.recentTransactions': '最近交易',
    'dashboard.fromDate': '开始日期',
    'dashboard.toDate': '结束日期',
    'dashboard.quickActions': '快捷操作',
    'dashboard.financialSummary': '财务摘要',
    'dashboard.createInvoice': '创建发票',
    'dashboard.createInvoiceDesc': '为客户生成新发票',
    'dashboard.recordExpense': '记录费用',
    'dashboard.recordExpenseDesc': '记录新的业务费用',
    'dashboard.processPayroll': '处理工资',
    'dashboard.processPayrollDesc': '生成和管理员工工资',
    'dashboard.viewReports': '查看报告',
    'dashboard.viewReportsDesc': '分析您的财务数据',
    'dashboard.revenue': '收入',
    'dashboard.expenses': '支出',
    
    // Clients
    'clients.title': '客户管理',
    'clients.description': '管理您的客户信息',
    'clients.addClient': '添加客户',
    'clients.editClient': '编辑客户',
    'clients.clientName': '客户名称',
    'clients.contactPerson': '联系人',
    
    // Vendors
    'vendors.title': '供应商管理',
    'vendors.description': '管理您的供应商信息',
    'vendors.addVendor': '添加供应商',
    'vendors.editVendor': '编辑供应商',
    'vendors.vendorName': '供应商名称',
    
    // Banks
    'banks.title': '银行账户',
    'banks.addBank': '添加银行账户',
    'banks.editBank': '编辑银行账户',
    'banks.bankName': '银行名称',
    'banks.accountName': '账户名称',
    'banks.accountNumber': '账户号码',
    'banks.branch': '支行',
    'banks.balance': '当前余额',
    'banks.balanceReadonly': '编辑时余额为只读。请通过交易更新。',
    
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
    'invoices.files': '文件',
    'invoices.createInvoice': '创建发票',
    
    // Expenses
    'expenses.title': '费用管理',
    'expenses.addExpense': '添加费用',
    'expenses.editExpense': '编辑费用',
    'expenses.category': '类别',
    'expenses.vendor': '供应商',
    'expenses.approved': '已批准',
    'expenses.pending': '待处理',
    'expenses.expenseNo': '费用编号',
    'expenses.files': '文件',
    
    // Employees
    'employees.title': '员工管理',
    'employees.addEmployee': '添加员工',
    'employees.editEmployee': '编辑员工',
    'employees.employeeName': '员工姓名',
    'employees.designation': '职位',
    'employees.basicSalary': '基本工资',
    'employees.epfNo': '公积金号',
    'employees.employeeId': '员工编号',
    'employees.department': '部门',
    
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
    'users.passwordHint': '留空以保持当前密码',
    
    // Vendors
    'vendors.taxId': '税号',
    
    // Reports
    'reports.title': '财务报告',
    'reports.overview': '概览',
    'reports.profitLoss': '损益表',
    'reports.report': '报告',
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
    'login.email': '邮箱地址',
    'login.password': '密码',
    'login.signIn': '登录',
    'login.forgotPassword': '忘记密码？',
    'login.accounts': '账户',
    'login.tagline1': '简化您的',
    'login.tagline2': '财务管理',
    'login.description': '完整的会计解决方案，包括发票、费用、工资和税务合规 - 全部集成在一个平台。',
    'login.createAccount': '创建账户',
    'login.welcomeBack': '欢迎回来',
    'login.signupSubtitle': '立即开始管理您的财务',
    'login.loginSubtitle': '登录以继续访问您的仪表板',
    'login.enterFullName': '输入您的全名',
    'login.creatingAccount': '正在创建账户...',
    'login.signingIn': '正在登录...',
    'login.haveAccount': '已有账户？',
    'login.noAccount': '没有账户？',
    'login.signInInstead': '改为登录',
    'login.createAccountLink': '创建账户',
    'login.allRightsReserved': '版权所有。',
    'login.loginFailed': '登录失败。请检查您的邮箱和密码。',
    'login.signupFailed': '注册失败。请重试。',
    
    // Guide
    'guide.title': '用户指南',
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
