import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface Activity {
  id: number;
  activity_type: string;
  activity_description: string;
  created_at: string;
  profile_name?: string;
}

export default function ProfileActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    
    // Auto-refresh disabled to prevent infinite loops
    // const interval = setInterval(loadActivities, 10000);
    // return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      const activeProfileStr = localStorage.getItem('activeProfile');
      if (!activeProfileStr) {
        setLoading(false);
        return;
      }
      
      const activeProfile = JSON.parse(activeProfileStr);
      const profileId = activeProfile.id;
      
      if (!profileId) {
        setLoading(false);
        return;
      }
      
      const res = await api.get(`/api/profiles/${profileId}/activity`);
      setActivities(res.data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      if (loading) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <p className="text-slate-400">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.slice(0, 10).map((activity) => {
          // Convert UTC to IST (add 5 hours 30 minutes)
          const utcDate = new Date(activity.created_at);
          const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
          
          return (
            <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-white">{activity.activity_description}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {istDate.toLocaleString('en-IN', { 
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
