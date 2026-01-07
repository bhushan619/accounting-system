import React, { useState, useMemo } from 'react';
import { Search, Save, RotateCcw, Globe, Check } from 'lucide-react';
import { useLanguage, defaultTranslations, Language } from '../contexts/LanguageContext';

export default function TranslationManagement() {
  const { t, translations, updateTranslation, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [editedTranslations, setEditedTranslations] = useState<Record<Language, Record<string, string>>>({
    en: { ...translations.en },
    zh: { ...translations.zh }
  });
  const [saved, setSaved] = useState(false);

  // Get all unique keys from both languages
  const allKeys = useMemo(() => {
    const keys = new Set([
      ...Object.keys(translations.en),
      ...Object.keys(translations.zh)
    ]);
    return Array.from(keys).sort();
  }, [translations]);

  // Filter keys based on search
  const filteredKeys = useMemo(() => {
    if (!searchQuery) return allKeys;
    const query = searchQuery.toLowerCase();
    return allKeys.filter(key => 
      key.toLowerCase().includes(query) ||
      (editedTranslations.en[key] || '').toLowerCase().includes(query) ||
      (editedTranslations.zh[key] || '').toLowerCase().includes(query)
    );
  }, [allKeys, searchQuery, editedTranslations]);

  // Group keys by category
  const groupedKeys = useMemo(() => {
    const groups: Record<string, string[]> = {};
    filteredKeys.forEach(key => {
      const category = key.split('.')[0];
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(key);
    });
    return groups;
  }, [filteredKeys]);

  const handleTranslationChange = (lang: Language, key: string, value: string) => {
    setEditedTranslations(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [key]: value
      }
    }));
    setSaved(false);
  };

  const handleSave = () => {
    // Update all translations
    Object.keys(editedTranslations.en).forEach(key => {
      updateTranslation('en', key, editedTranslations.en[key]);
    });
    Object.keys(editedTranslations.zh).forEach(key => {
      updateTranslation('zh', key, editedTranslations.zh[key]);
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setEditedTranslations({
      en: { ...defaultTranslations.en },
      zh: { ...defaultTranslations.zh }
    });
    // Also reset in context
    Object.keys(defaultTranslations.en).forEach(key => {
      updateTranslation('en', key, defaultTranslations.en[key]);
    });
    Object.keys(defaultTranslations.zh).forEach(key => {
      updateTranslation('zh', key, defaultTranslations.zh[key]);
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      nav: language === 'zh' ? '导航' : 'Navigation',
      common: language === 'zh' ? '通用' : 'Common',
      dashboard: language === 'zh' ? '仪表板' : 'Dashboard',
      clients: language === 'zh' ? '客户' : 'Clients',
      vendors: language === 'zh' ? '供应商' : 'Vendors',
      banks: language === 'zh' ? '银行' : 'Banks',
      invoices: language === 'zh' ? '发票' : 'Invoices',
      expenses: language === 'zh' ? '费用' : 'Expenses',
      employees: language === 'zh' ? '员工' : 'Employees',
      payroll: language === 'zh' ? '工资' : 'Payroll',
      users: language === 'zh' ? '用户' : 'Users',
      reports: language === 'zh' ? '报告' : 'Reports',
      taxReports: language === 'zh' ? '税务报告' : 'Tax Reports',
      translations: language === 'zh' ? '翻译' : 'Translations',
      login: language === 'zh' ? '登录' : 'Login',
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Globe className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('translations.title')}</h1>
            <p className="text-muted-foreground text-sm">
              {language === 'zh' ? '管理应用程序的多语言翻译' : 'Manage multilingual translations for the application'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <RotateCcw size={18} />
            {t('translations.resetToDefault')}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {saved ? <Check size={18} /> : <Save size={18} />}
            {saved ? t('translations.saved') : t('translations.saveChanges')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
        <input
          type="text"
          placeholder={t('translations.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Translation Groups */}
      <div className="space-y-6">
        {Object.entries(groupedKeys).map(([category, keys]) => (
          <div key={category} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 bg-muted/50 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground capitalize">
                {getCategoryLabel(category)}
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground w-1/4">
                      {t('translations.key')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground w-[37.5%]">
                      {t('translations.english')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground w-[37.5%]">
                      {t('translations.chinese')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3">
                        <code className="text-xs bg-muted px-2 py-1 rounded text-foreground/70">
                          {key}
                        </code>
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editedTranslations.en[key] || ''}
                          onChange={(e) => handleTranslationChange('en', key, e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editedTranslations.zh[key] || ''}
                          onChange={(e) => handleTranslationChange('zh', key, e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {filteredKeys.length === 0 && (
        <div className="text-center py-12">
          <Globe className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </div>
      )}
    </div>
  );
}
