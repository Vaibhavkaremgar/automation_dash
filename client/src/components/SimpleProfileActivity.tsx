import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function SimpleProfileActivity() {
  const { user } = useAuth();

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 text-white">Profile</h3>
      <div className="space-y-2 text-xs text-slate-300">
        <p><span className="text-slate-400">Name:</span> {user?.name || 'N/A'}</p>
        <p><span className="text-slate-400">Email:</span> {user?.email || 'N/A'}</p>
        <p><span className="text-slate-400">Role:</span> {user?.role || 'User'}</p>
        <p><span className="text-slate-400">Status:</span> <span className="text-green-400">Active</span></p>
      </div>
    </div>
  );
}
