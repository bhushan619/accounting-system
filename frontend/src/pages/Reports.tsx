import React from 'react';
import { Download } from 'lucide-react';

export default function Reports() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Overview Report</h2>
          <p className="text-gray-600 mb-4">Financial summary and key metrics</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download size={18} />
            Generate
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Profit & Loss</h2>
          <p className="text-gray-600 mb-4">Detailed P&L statement</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download size={18} />
            Generate
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Expense Breakdown</h2>
          <p className="text-gray-600 mb-4">Expenses by category</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download size={18} />
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
