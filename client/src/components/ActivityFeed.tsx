import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Activity {
  id: number;
  activity_type: string;
  activity_description: string;
  profile_name?: string;
  created_at: string;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const res = await api.get('/api/profiles/activity/all?limit=10');
      setActivities(res.data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (activities.length === 0) return null;

  return (
    <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>📊</span> Recent Activity
      </h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg"
          >
            <div className="flex-1">
              <p className="text-sm text-white">{activity.activity_description}</p>
              <div className="flex items-center gap-2 mt-1">
                {activity.profile_name && (
                  <span className="text-xs text-slate-400">
                    by {activity.profile_name}
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {new Date(activity.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
