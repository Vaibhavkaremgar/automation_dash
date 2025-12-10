import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface IPManagementModalProps {
  userId: number;
  userName: string;
  modalId: string;
}

interface IPAddress {
  id: number;
  ip_address: string;
  created_at: string;
}

export default function IPManagementModal({ userId, userName, modalId }: IPManagementModalProps) {
  const [ips, setIps] = useState<IPAddress[]>([]);
  const [newIp, setNewIp] = useState('');
  const [loading, setLoading] = useState(false);

  const loadIPs = async () => {
    try {
      const res = await api.get(`/api/admin/users/${userId}/ips`);
      setIps(res.data.ips || []);
    } catch (error) {
      console.error('Failed to load IPs:', error);
    }
  };

  const addIP = async () => {
    if (!newIp.trim()) {
      alert('Please enter an IP address');
      return;
    }

    try {
      setLoading(true);
      await api.post(`/api/admin/users/${userId}/ips`, { ip_address: newIp.trim() });
      setNewIp('');
      loadIPs();
      alert('IP address added successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add IP');
    } finally {
      setLoading(false);
    }
  };

  const deleteIP = async (ipId: number) => {
    if (!confirm('Remove this IP address?')) return;

    try {
      await api.delete(`/api/admin/users/${userId}/ips/${ipId}`);
      loadIPs();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete IP');
    }
  };

  useEffect(() => {
    const modal = document.getElementById(modalId) as HTMLDialogElement;
    if (!modal) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'open' && modal.hasAttribute('open')) {
          loadIPs();
        }
      });
    });
    
    observer.observe(modal, { attributes: true });
    return () => observer.disconnect();
  }, [modalId]);

  return (
    <dialog id={modalId} className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl backdrop:bg-black/50">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">IP Access Control - {userName}</h2>
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

        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-3">
          <p className="text-yellow-200 text-sm">
            ⚠️ When IP restrictions are enabled, this user can only login from the IPs listed below.
            Leave empty to allow login from any IP.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-white font-semibold">Allowed IP Addresses</h3>
          
          {ips.length === 0 ? (
            <div className="text-slate-400 text-sm p-4 bg-slate-700/50 rounded">
              No IP restrictions set. User can login from any IP.
            </div>
          ) : (
            <div className="space-y-2">
              {ips.map((ip) => (
                <div key={ip.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded">
                  <div>
                    <span className="text-white font-mono">{ip.ip_address}</span>
                    <span className="text-slate-400 text-xs ml-3">
                      Added: {new Date(ip.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteIP(ip.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-white font-semibold">Add New IP Address</h3>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., 192.168.1.100 or 203.0.113.0"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addIP()}
            />
            <Button onClick={addIP} disabled={loading}>
              {loading ? 'Adding...' : 'Add IP'}
            </Button>
          </div>
          <p className="text-slate-400 text-xs">
            💡 Tip: You can add multiple IPs. User will be able to login from any of these IPs.
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
            Close
          </Button>
        </div>
      </div>
    </dialog>
  );
}
