import React from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Reports() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('reports')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">{t('overviewReport')}</h2>
          <p className="text-gray-600 mb-4">{t('overviewReportDesc')}</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download size={18} />
            {t('generate')}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">{t('profitLoss')}</h2>
          <p className="text-gray-600 mb-4">{t('profitLossDesc')}</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download size={18} />
            {t('generate')}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">{t('expenseBreakdown')}</h2>
          <p className="text-gray-600 mb-4">{t('expenseBreakdownDesc')}</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download size={18} />
            {t('generate')}
          </button>
        </div>
      </div>
    </div>
  );
}
