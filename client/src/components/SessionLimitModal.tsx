import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface SessionLimitModalProps {
  userId: number;
  userName: string;
  modalId: string;
}

export default function SessionLimitModal({ userId, userName, modalId }: SessionLimitModalProps) {
  const [maxSessions, setMaxSessions] = useState<number>(5);
  const [loading, setLoading] = useState(false);

  const loadSessionLimit = async () => {
    try {
      const res = await api.get(`/api/admin/users/${userId}/session-limit`);
      setMaxSessions(res.data.max_sessions || 5);
    } catch (error) {
      console.error('Failed to load session limit:', error);
    }
  };

  const updateSessionLimit = async () => {
    if (maxSessions < 1) {
      alert('Session limit must be at least 1');
      return;
    }

    try {
      setLoading(true);
      await api.put(`/api/admin/users/${userId}/session-limit`, { max_sessions: maxSessions });
      alert('Session limit updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update session limit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const modal = document.getElementById(modalId) as HTMLDialogElement;
    if (!modal) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'open' && modal.hasAttribute('open')) {
          loadSessionLimit();
        }
      });
    });
    
    observer.observe(modal, { attributes: true });
    return () => observer.disconnect();
  }, [modalId]);

  return (
    <dialog id={modalId} className="bg-slate-800 rounded-lg p-6 w-full max-w-md backdrop:bg-black/50">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Session Limit - {userName}</h2>
          <button
            onClick={() => {
              const modal = document.getElementById(modalId) as HTMLDialogElement;
              modal?.close();
            }}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3">
          <p className="text-blue-200 text-sm">
            ℹ️ When session limits are enabled, this user can have a maximum of this many active sessions. 
            Logging in beyond this limit will log out the oldest session.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-white font-semibold block">Maximum Active Sessions</label>
          <Input
            type="number"
            min={1}
            max={100}
            value={maxSessions}
            onChange={(e) => setMaxSessions(parseInt(e.target.value) || 1)}
          />
          <p className="text-slate-400 text-xs">
            💡 Recommended: 3-5 sessions for normal users, 10+ for shared accounts
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={() => {
              const modal = document.getElementById(modalId) as HTMLDialogElement;
              modal?.close();
            }}
          >
            Cancel
          </Button>
          <Button onClick={updateSessionLimit} disabled={loading}>
            {loading ? 'Updating...' : 'Update Limit'}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
