import React from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Reports() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">{t('reports')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg shadow border border-border p-6">
          <h2 className="text-xl font-semibold mb-2 text-foreground">{t('overviewReport')}</h2>
          <p className="text-muted-foreground mb-4">{t('overviewReportDesc')}</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
            <Download size={18} />
            {t('generate')}
          </button>
        </div>

        <div className="bg-card rounded-lg shadow border border-border p-6">
          <h2 className="text-xl font-semibold mb-2 text-foreground">{t('profitLoss')}</h2>
          <p className="text-muted-foreground mb-4">{t('profitLossDesc')}</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
            <Download size={18} />
            {t('generate')}
          </button>
        </div>

        <div className="bg-card rounded-lg shadow border border-border p-6">
          <h2 className="text-xl font-semibold mb-2 text-foreground">{t('expenseBreakdown')}</h2>
          <p className="text-muted-foreground mb-4">{t('expenseBreakdownDesc')}</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
            <Download size={18} />
            {t('generate')}
          </button>
        </div>
      </div>
    </div>
  );
}