import React from 'react';
import { Plus } from 'lucide-react';

export default function Vendors() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Vendors</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={20} />
          Add Vendor
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Vendor management system</p>
      </div>
    </div>
  );
}
