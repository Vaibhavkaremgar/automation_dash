import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function SimpleActivityFeed() {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const res = await api.get('/api/insurance/activity-feed');
      setActivities(res.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 text-white">Recent Activity</h3>
      <div className="space-y-2">
        {activities.length === 0 ? (
          <p className="text-xs text-slate-400">No recent activity</p>
        ) : (
          activities.map((activity, idx) => (
            <div key={idx} className="text-xs text-slate-300 py-1 border-b border-slate-700">
              <p>{activity.message || activity.action}</p>
              <p className="text-slate-500 text-[10px]">{new Date(activity.created_at).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
