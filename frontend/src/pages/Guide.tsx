import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Section {
  title: string;
  content: string;
}

const sections: Section[] = [
  {
    title: 'Getting Started',
    content: 'Welcome to VeloSync! This guide will help you navigate the system and manage your accounting operations effectively.'
  },
  {
    title: 'Managing Clients',
    content: 'Create and manage client records. Navigate to Clients page to add new clients with their contact information.'
  },
  {
    title: 'Creating Invoices',
    content: 'Generate professional invoices with line items, tax calculations, and automatic serial numbers. Attach supporting documents as needed.'
  },
  {
    title: 'Tracking Expenses',
    content: 'Record business expenses with receipt uploads. Categorize expenses and link them to vendors for better tracking.'
  },
  {
    title: 'Payroll Management',
    content: 'Calculate employee payroll with Sri Lankan compliance including EPF (8% employee, 12% employer), ETF (3%), APIT, and stamp fees.'
  },
  {
    title: 'Reports and Analytics',
    content: 'Generate comprehensive financial reports including profit & loss statements, expense breakdowns, and overview summaries.'
  }
];

export default function Guide() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">User Guide</h1>

      <div className="bg-white rounded-lg shadow">
        {sections.map((section, index) => (
          <div key={index} className="border-b last:border-b-0">
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-lg text-gray-800">{section.title}</span>
              {expandedIndex === index ? (
                <ChevronUp className="text-gray-600" />
              ) : (
                <ChevronDown className="text-gray-600" />
              )}
            </button>
            {expandedIndex === index && (
              <div className="px-6 pb-4">
                <p className="text-gray-600">{section.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
