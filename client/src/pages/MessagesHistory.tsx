import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { api } from '../lib/api';

interface Message {
  id: number;
  customer_id: number;
  customer_name?: string;
  mobile_number?: string;
  message_type: string;
  channel: string;
  message_content: string;
  status: string;
  sent_at: string;
}

export default function MessagesHistory() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/insurance/message-logs');
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-200 border-slate-500/30';
    }
  };

  const getMessageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'reminder_30': '30 Days Reminder',
      'reminder_7': '7 Days Reminder',
      'reminder_1': '1 Day Reminder',
      'expired_7': '7 Days Expired',
      'expired_15': '15 Days Expired',
      'thank_you': 'Thank You',
      'notification': 'Notification'
    };
    return labels[type] || type;
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true;
    return msg.status === filter;
  });

  const totalSent = messages.filter(m => m.status === 'sent').length;
  const totalPending = messages.filter(m => m.status === 'pending').length;
  const totalFailed = messages.filter(m => m.status === 'failed').length;
  const totalCost = 0; // Cost tracking not implemented yet

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
          Messages History
        </h1>
        <Button onClick={loadMessages}>Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
          <h4 className="text-sm text-slate-300 mb-2">Total Sent</h4>
          <p className="text-2xl font-bold text-green-400">{totalSent}</p>
        </div>
        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
          <h4 className="text-sm text-slate-300 mb-2">Pending</h4>
          <p className="text-2xl font-bold text-yellow-400">{totalPending}</p>
        </div>
        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
          <h4 className="text-sm text-slate-300 mb-2">Failed</h4>
          <p className="text-2xl font-bold text-red-400">{totalFailed}</p>
        </div>
        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
          <h4 className="text-sm text-slate-300 mb-2">Total Cost</h4>
          <p className="text-2xl font-bold text-cyan-400">₹{totalCost}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          All
        </Button>
        <Button
          variant={filter === 'sent' ? 'default' : 'outline'}
          onClick={() => setFilter('sent')}
          size="sm"
        >
          Sent
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
          size="sm"
        >
          Pending
        </Button>
        <Button
          variant={filter === 'failed' ? 'default' : 'outline'}
          onClick={() => setFilter('failed')}
          size="sm"
        >
          Failed
        </Button>
      </div>

      {/* Messages Table */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Message Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Channel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Sent Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No messages found
                  </td>
                </tr>
              ) : (
                filteredMessages.map((message) => (
                  <tr key={message.id} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {message.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                      {getMessageTypeLabel(message.message_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                      {message.channel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                      {message.sent_at && !isNaN(new Date(message.sent_at).getTime()) 
                        ? new Date(message.sent_at).toLocaleString() 
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(message.status)}`}>
                        {message.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-100 max-w-xs truncate">
                      {message.message_content || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
