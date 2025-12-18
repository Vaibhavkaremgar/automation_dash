import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
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
  const [messageTypeFilter, setMessageTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageTypeFilter, setShowMessageTypeFilter] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);

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
      'renewal_reminder': 'Renewal Reminder',
      'thank_you': 'Thank You',
      'policy_summary': 'Policy Summary',
      'bulk_summary': 'Bulk Summary',
      'claim_update': 'Claim Update',
      'notification': 'Notification'
    };
    return labels[type] || type;
  };

  const isToday = (date: string) => {
    const today = new Date();
    const msgDate = new Date(date);
    return today.toDateString() === msgDate.toDateString();
  };

  const isYesterday = (date: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(date);
    return yesterday.toDateString() === msgDate.toDateString();
  };

  const isThisWeek = (date: string) => {
    const today = new Date();
    const msgDate = new Date(date);
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    return msgDate >= weekAgo && msgDate <= today;
  };

  const isThisMonth = (date: string) => {
    const today = new Date();
    const msgDate = new Date(date);
    return today.getMonth() === msgDate.getMonth() && today.getFullYear() === msgDate.getFullYear();
  };

  const filteredMessages = messages.filter(msg => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        msg.customer_name?.toLowerCase().includes(search) ||
        msg.mobile_number?.includes(search) ||
        msg.message_content?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Message type filter
    if (messageTypeFilter !== 'all' && msg.message_type !== messageTypeFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== 'all' && dateFilter !== 'custom') {
      if (!msg.sent_at) return false;
      if (dateFilter === 'today' && !isToday(msg.sent_at)) return false;
      if (dateFilter === 'yesterday' && !isYesterday(msg.sent_at)) return false;
      if (dateFilter === 'week' && !isThisWeek(msg.sent_at)) return false;
      if (dateFilter === 'month' && !isThisMonth(msg.sent_at)) return false;
    }

    // Custom date range
    if (dateFilter === 'custom' && (dateFrom || dateTo)) {
      if (!msg.sent_at) return false;
      const msgDate = new Date(msg.sent_at);
      if (dateFrom && msgDate < new Date(dateFrom)) return false;
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        if (msgDate > endDate) return false;
      }
    }

    return true;
  });

  const todayCount = messages.filter(m => m.sent_at && isToday(m.sent_at)).length;
  const yesterdayCount = messages.filter(m => m.sent_at && isYesterday(m.sent_at)).length;
  const thisWeekCount = messages.filter(m => m.sent_at && isThisWeek(m.sent_at)).length;
  const thisMonthCount = messages.filter(m => m.sent_at && isThisMonth(m.sent_at)).length;

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
        <div 
          className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all"
          onClick={() => setDateFilter('today')}
        >
          <h4 className="text-sm text-slate-300 mb-2">Today</h4>
          <p className="text-2xl font-bold text-green-400">{todayCount}</p>
        </div>
        <div 
          className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all"
          onClick={() => setDateFilter('yesterday')}
        >
          <h4 className="text-sm text-slate-300 mb-2">Yesterday</h4>
          <p className="text-2xl font-bold text-blue-400">{yesterdayCount}</p>
        </div>
        <div 
          className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all"
          onClick={() => setDateFilter('week')}
        >
          <h4 className="text-sm text-slate-300 mb-2">This Week</h4>
          <p className="text-2xl font-bold text-purple-400">{thisWeekCount}</p>
        </div>
        <div 
          className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all"
          onClick={() => setDateFilter('month')}
        >
          <h4 className="text-sm text-slate-300 mb-2">This Month</h4>
          <p className="text-2xl font-bold text-cyan-400">{thisMonthCount}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar and Filter Buttons */}
        <div className="flex gap-3">
          <Input
            placeholder="Search by customer name, mobile, or message content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button 
            variant={messageTypeFilter !== 'all' ? 'default' : 'outline'}
            onClick={() => setShowMessageTypeFilter(!showMessageTypeFilter)}
          >
            📋 Message Type {messageTypeFilter !== 'all' && '✓'}
          </Button>
          <Button 
            variant={dateFilter !== 'all' ? 'default' : 'outline'}
            onClick={() => setShowDateFilter(!showDateFilter)}
          >
            📅 Date Range {dateFilter !== 'all' && '✓'}
          </Button>
          {(searchTerm || messageTypeFilter !== 'all' || dateFilter !== 'all') && (
            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setMessageTypeFilter('all');
              setDateFilter('all');
              setDateFrom('');
              setDateTo('');
            }}>
              Clear All
            </Button>
          )}
        </div>

        {/* Message Type Filter Dropdown */}
        {showMessageTypeFilter && (
          <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-2">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Filter by Message Type</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={messageTypeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => { setMessageTypeFilter('all'); setShowMessageTypeFilter(false); }}
                size="sm"
              >
                All Messages
              </Button>
              <Button
                variant={messageTypeFilter === 'renewal_reminder' ? 'default' : 'outline'}
                onClick={() => { setMessageTypeFilter('renewal_reminder'); setShowMessageTypeFilter(false); }}
                size="sm"
              >
                Renewal Reminders
              </Button>
              <Button
                variant={messageTypeFilter === 'thank_you' ? 'default' : 'outline'}
                onClick={() => { setMessageTypeFilter('thank_you'); setShowMessageTypeFilter(false); }}
                size="sm"
              >
                Thank You
              </Button>
              <Button
                variant={messageTypeFilter === 'policy_summary' ? 'default' : 'outline'}
                onClick={() => { setMessageTypeFilter('policy_summary'); setShowMessageTypeFilter(false); }}
                size="sm"
              >
                Policy Summary
              </Button>
              <Button
                variant={messageTypeFilter === 'bulk_summary' ? 'default' : 'outline'}
                onClick={() => { setMessageTypeFilter('bulk_summary'); setShowMessageTypeFilter(false); }}
                size="sm"
              >
                Bulk Messages
              </Button>
              <Button
                variant={messageTypeFilter === 'claim_update' ? 'default' : 'outline'}
                onClick={() => { setMessageTypeFilter('claim_update'); setShowMessageTypeFilter(false); }}
                size="sm"
              >
                Claim Updates
              </Button>
            </div>
          </div>
        )}

        {/* Date Filter Dropdown */}
        {showDateFilter && (
          <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-3">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Filter by Date Range</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={dateFilter === 'all' ? 'default' : 'outline'}
                onClick={() => { setDateFilter('all'); setDateFrom(''); setDateTo(''); setShowDateFilter(false); }}
                size="sm"
              >
                All Time
              </Button>
              <Button
                variant={dateFilter === 'today' ? 'default' : 'outline'}
                onClick={() => { setDateFilter('today'); setShowDateFilter(false); }}
                size="sm"
              >
                Today
              </Button>
              <Button
                variant={dateFilter === 'yesterday' ? 'default' : 'outline'}
                onClick={() => { setDateFilter('yesterday'); setShowDateFilter(false); }}
                size="sm"
              >
                Yesterday
              </Button>
              <Button
                variant={dateFilter === 'week' ? 'default' : 'outline'}
                onClick={() => { setDateFilter('week'); setShowDateFilter(false); }}
                size="sm"
              >
                This Week
              </Button>
              <Button
                variant={dateFilter === 'month' ? 'default' : 'outline'}
                onClick={() => { setDateFilter('month'); setShowDateFilter(false); }}
                size="sm"
              >
                This Month
              </Button>
              <Button
                variant={dateFilter === 'custom' ? 'default' : 'outline'}
                onClick={() => setDateFilter('custom')}
                size="sm"
              >
                Custom Range
              </Button>
            </div>
            
            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="flex gap-3 items-center pt-2 border-t border-slate-700">
                <span className="text-sm text-slate-300">From:</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-auto"
                />
                <span className="text-sm text-slate-300">To:</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-auto"
                />
                <Button size="sm" onClick={() => setShowDateFilter(false)}>Apply</Button>
              </div>
            )}
          </div>
        )}

        {/* Active Filters Summary */}
        {(searchTerm || messageTypeFilter !== 'all' || dateFilter !== 'all') && (
          <div className="p-3 bg-cyan-900/20 border border-cyan-700/50 rounded-lg">
            <span className="text-sm text-cyan-300">Showing {filteredMessages.length} of {messages.length} messages</span>
          </div>
        )}
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
                  <tr 
                    key={message.id} 
                    className="hover:bg-slate-700/30 cursor-pointer"
                    onClick={() => setSelectedMessage(message)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {message.customer_name || 'Unknown Customer'}
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

      {/* Message Details Modal */}
      <Modal 
        open={!!selectedMessage} 
        onClose={() => setSelectedMessage(null)} 
        title="Message Details"
      >
        {selectedMessage && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Customer Information</h4>
              <p className="text-white font-medium">{selectedMessage.customer_name || 'Unknown Customer'}</p>
              {selectedMessage.mobile_number && (
                <p className="text-sm text-slate-300">{selectedMessage.mobile_number}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <h4 className="text-xs text-slate-400 mb-1">Message Type</h4>
                <p className="text-sm text-white">{getMessageTypeLabel(selectedMessage.message_type)}</p>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <h4 className="text-xs text-slate-400 mb-1">Channel</h4>
                <p className="text-sm text-white">{selectedMessage.channel}</p>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <h4 className="text-xs text-slate-400 mb-1">Status</h4>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(selectedMessage.status)}`}>
                  {selectedMessage.status}
                </span>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <h4 className="text-xs text-slate-400 mb-1">Sent Date</h4>
                <p className="text-sm text-white">
                  {selectedMessage.sent_at && !isNaN(new Date(selectedMessage.sent_at).getTime()) 
                    ? new Date(selectedMessage.sent_at).toLocaleString() 
                    : '-'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Message Content</h4>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-600/30 max-h-96 overflow-y-auto">
                <p className="text-white whitespace-pre-wrap">{selectedMessage.message_content || 'No content'}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setSelectedMessage(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
