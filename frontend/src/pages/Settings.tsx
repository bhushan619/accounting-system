import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Settings</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="space-y-2">
          <p className="text-gray-600">
            <span className="font-medium">Email:</span> {user?.email}
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Role:</span> {user?.role}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">System Settings</h2>
        <p className="text-gray-600">Configure tax rates, currencies, and other system preferences</p>
      </div>
    </div>
  );
}
