import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface Activity {
  id: number;
  action_type: string;
  action_description: string;
  created_at: string;
  profile_name?: string;
}

export default function ProfileActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const profileId = localStorage.getItem('selectedProfileId');
      if (!profileId) {
        setLoading(false);
        return;
      }
      
      const res = await api.get(`/api/profiles/${profileId}/activity?limit=10`);
      setActivities(res.data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <p className="text-slate-400">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
            <div className="flex-1">
              <p className="text-sm text-white">{activity.action_description}</p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(activity.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
