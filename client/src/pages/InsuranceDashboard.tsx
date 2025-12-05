import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { api } from '../lib/api';

// Dynamic config
let SHEET_TAB_NAME = 'updating_input';

interface Customer {
  id: number;
  name: string;
  mobile_number: string;
  renewal_date: string;
  od_expiry_date: string;
  tp_expiry_date: string;
  company: string;
  product: string;
  registration_no: string;
  premium: number;
  status: string;
  reason: string;
  vertical: string;
}

interface Analytics {
  totalCustomers: number;
  upcomingRenewals: number;
  messagesSent: number;
  totalSpent: number;
  totalPolicies?: number;
  activePolicies?: number;
  expiredPolicies?: number;
  expiringPolicies?: number;
  totalPremium?: number;
}

export default function InsuranceDashboard() {
  const location = useLocation();
  const [verticalFilter, setVerticalFilter] = useState(() => {
    return localStorage.getItem('insuranceVerticalFilter') || 'all'
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [clientConfig, setClientConfig] = useState<any>(null);
  const [sheetFields, setSheetFields] = useState<string[]>([]);
  const isJoban = user?.email?.toLowerCase().includes('joban') || false;
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [renewalStats, setRenewalStats] = useState({ reminders_today: 0, customers_reminded: 0 });
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteCustomerId, setNoteCustomerId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [policyTab, setPolicyTab] = useState<'active' | 'total' | 'lost' | 'pending'>(() => {
    const saved = localStorage.getItem('insurancePolicyTab');
    if (saved && ['active', 'total', 'lost', 'pending'].includes(saved)) {
      return saved as 'active' | 'total' | 'lost' | 'pending';
    }
    return 'active';
  });

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes('/customers')) return 'customers';
    if (path.includes('/policies')) return 'policies';
    if (path.includes('/renewals')) return 'renewals';
    return 'dashboard';
  };

  const currentTab = getCurrentTab();

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    mobile_number: '',
    insurance_activated_date: '',
    renewal_date: '',
    od_expiry_date: '',
    tp_expiry_date: '',
    premium_mode: '',
    premium: '',
    last_year_premium: '',
    vertical: 'motor',
    product: '',
    registration_no: '',
    current_policy_no: '',
    company: '',
    status: 'pending',
    new_policy_no: '',
    new_company: '',
    policy_doc_link: '',
    thank_you_sent: '',
    reason: '',
    email: '',
    cheque_hold: '',
    payment_date: '',
    cheque_no: '',
    cheque_bounce: '',
    owner_alert_sent: ''
  });

  useEffect(() => {
    loadClientConfig();
    loadData();
    
    const handleVerticalChange = (e: any) => {
      setVerticalFilter(e.detail);
      localStorage.setItem('insuranceVerticalFilter', e.detail);
    };
    
    window.addEventListener('insuranceVerticalChange', handleVerticalChange);
    
    // Auto-sync every 2 minutes
    const syncInterval = setInterval(() => {
      console.log('Auto-syncing from Google Sheets...');
      syncFromSheets(true); // silent mode
    }, 2 * 60 * 1000); // 2 minutes
    
    return () => {
      window.removeEventListener('insuranceVerticalChange', handleVerticalChange);
      clearInterval(syncInterval);
    };
  }, [verticalFilter]);

  useEffect(() => {
    if (currentTab === 'renewals') {
      loadRenewalStats();
    }
  }, [currentTab]);

  const loadRenewalStats = async () => {
    try {
      const res = await api.get('/api/insurance/renewal-stats');
      setRenewalStats(res.data);
    } catch (error) {
      console.error('Failed to load renewal stats:', error);
    }
  };

  const getDisplayDate = (customer: Customer) => {
    if (customer.vertical === 'motor') {
      return customer.od_expiry_date || customer.renewal_date;
    }
    return customer.renewal_date;
  };

  const getDaysUntilExpiry = (customer: Customer) => {
    const renewalDate = getDisplayDate(customer);
    if (!renewalDate || !renewalDate.includes('/')) return 999;
    const [day, month, year] = renewalDate.split('/');
    const expiry = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const categorizeCustomers = () => {
    const overdue = customers.filter(c => getDaysUntilExpiry(c) < 0 && c.status.trim().toLowerCase() === 'pending');
    const expiring7 = customers.filter(c => {
      const days = getDaysUntilExpiry(c);
      return days >= 0 && days <= 7 && c.status.trim().toLowerCase() === 'pending';
    });
    const expiring30 = customers.filter(c => {
      const days = getDaysUntilExpiry(c);
      return days > 7 && days <= 30 && c.status.trim().toLowerCase() === 'pending';
    });
    const renewed = customers.filter(c => c.status.trim().toLowerCase() === 'done');
    
    return { overdue, expiring7, expiring30, renewed };
  };

  const handleBulkStatusToggle = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select customers');
      return;
    }
    
    // Check if all selected customers have the same status
    const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id));
    const allPending = selectedCustomerData.every(c => c.status.trim().toLowerCase() === 'pending');
    const allDone = selectedCustomerData.every(c => c.status.trim().toLowerCase() === 'done');
    
    let newStatus = '';
    let action = '';
    
    if (allPending) {
      newStatus = 'done';
      action = 'renewed';
    } else if (allDone) {
      newStatus = 'pending';
      action = 'marked as pending';
    } else {
      // Mixed statuses - ask user
      const confirmAction = confirm('Selected customers have mixed statuses. Mark all as Renewed?');
      newStatus = confirmAction ? 'done' : 'pending';
      action = confirmAction ? 'renewed' : 'marked as pending';
    }
    
    try {
      // Update each customer
      for (const customerId of selectedCustomers) {
        await api.put(`/api/insurance/customers/${customerId}`, {
          ...customers.find(c => c.id === customerId),
          status: newStatus
        });
      }
      
      await api.post('/api/insurance/sync/to-sheet', {
        tabName: SHEET_TAB_NAME
      });
      
      // Send thank you messages if marked as renewed
      if (newStatus === 'done' && confirm('Send Thank You messages via WhatsApp to renewed customers?')) {
        selectedCustomerData.forEach(customer => {
          const message = `Dear ${customer.name},\n\nThank you for renewing your insurance policy with us! 🎉\n\nYour policy is now active and you are covered.\n\nWe appreciate your trust in KMG Insurance Agency.\n\nFor any assistance, feel free to contact us anytime.\n\nThank you!`;
          window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`);
        });
      }
      
      setSelectedCustomers([]);
      loadData();
      alert(`${selectedCustomers.length} customers ${action}`);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update customer status');
    }
  };

  const handleAddNote = async () => {
    if (!noteCustomerId || !note) return;
    
    try {
      await api.post(`/api/insurance/customers/${noteCustomerId}/notes`, { note });
      setShowNoteModal(false);
      setNote('');
      setNoteCustomerId(null);
      alert('Note added successfully');
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const viewHistory = async (customerId: number) => {
    try {
      const res = await api.get(`/api/insurance/customers/${customerId}/history`);
      setCustomerHistory(res.data);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const toggleCustomerSelection = (id: number) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const renderRenewalCard = (customer: Customer, daysLabel: string, colorClass: string, isRenewed: boolean = false) => (
    <div key={customer.id} className={`p-4 bg-slate-700/50 rounded-lg border ${colorClass} flex items-center gap-4`}>
      <input
        type="checkbox"
        checked={selectedCustomers.includes(customer.id)}
        onChange={() => toggleCustomerSelection(customer.id)}
        className="w-4 h-4"
      />
      <div className="flex-1">
        <h4 className="font-medium text-white">{customer.name}</h4>
        <p className="text-sm text-slate-300">{customer.registration_no} - {customer.company}</p>
        <p className="text-sm font-medium mt-1">{daysLabel}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-white text-lg">₹{customer.premium?.toLocaleString()}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => alert('🔒 Premium Feature\n\nUpgrade to Voice Bot Premium to enable automated calling.\n\nContact support to upgrade.')} className="opacity-60" title="Premium Feature">📞🔒</Button>
        <Button size="sm" variant="outline" onClick={() => {
          let message = '';
          
          const displayDate = getDisplayDate(customer);
          const days = getDaysUntilExpiry(customer);
          
          if (isRenewed) {
            message = `Dear ${customer.name},\n\nThank you for renewing your insurance policy with us! 🎉\n\nYour policy is now active and you are covered.\n\nWe appreciate your trust in KMG Insurance Agency.\n\nFor any assistance, feel free to contact us anytime.\n\nThank you!`;
          } else {
            if (days < 0) {
              message = `Dear ${customer.name},\n\nYour insurance policy has expired on ${displayDate}. Please renew it immediately to avoid any inconvenience.\n\nFor renewal assistance, contact KMG Insurance Agency.\n\nThank you!`;
            } else if (days === 0 || days === 1) {
              message = `🚨 URGENT REMINDER 🚨\n\nDear ${customer.name},\n\nYour insurance policy expires TOMORROW (${displayDate})! Please renew immediately to avoid policy lapse.\n\nContact KMG Insurance Agency NOW for instant renewal.\n\nThank you!`;
            } else if (days <= 7) {
              message = `Dear ${customer.name},\n\nThis is a reminder that your insurance policy will expire on ${displayDate} (in ${days} days).\n\nPlease renew your policy at the earliest to ensure continuous coverage.\n\nKMG Insurance Agency\nYour trusted insurance partner.\n\nThank you!`;
            } else if (days <= 30) {
              message = `Dear ${customer.name},\n\nYour insurance policy is due for renewal on ${displayDate} (in ${days} days).\n\nWe recommend renewing early to avoid last-minute hassles.\n\nKMG Insurance Agency is here to assist you.\n\nThank you!`;
            }
          }
          window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`);
        }}>💬</Button>
        <Button size="sm" variant="outline" onClick={() => { setNoteCustomerId(customer.id); setShowNoteModal(true); }}>📝</Button>
        <Button size="sm" variant="outline" onClick={() => viewHistory(customer.id)}>📋</Button>
      </div>
    </div>
  );

  const loadClientConfig = async () => {
    try {
      const res = await api.get('/api/insurance-config/config');
      console.log('🔍 CLIENT CONFIG:', res.data);
      console.log('📋 SHEET FIELDS:', res.data.sheetHeaders);
      setClientConfig(res.data);
      setSheetFields(res.data.sheetHeaders || []);
      SHEET_TAB_NAME = res.data.tabName;
    } catch (error) {
      console.error('Failed to load client config:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const verticalParam = `?vertical=${verticalFilter}`;
      const [customersRes, analyticsRes, policyAnalyticsRes] = await Promise.all([
        api.get(`/api/insurance/customers${verticalParam}`),
        api.get(`/api/insurance/analytics${verticalParam}`),
        api.get(`/api/policies/analytics${verticalParam}`)
      ]);
      setCustomers(customersRes.data);
      setAnalytics({...analyticsRes.data, ...policyAnalyticsRes.data});
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.mobile_number) {
      alert('Name and Mobile Number are required!');
      return;
    }
    
    try {
      const convertDate = (date: string) => {
        if (!date) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          const [year, month, day] = date.split('-');
          return `${day}/${month}/${year}`;
        }
        return date;
      };
      
      await api.post('/api/insurance/customers', {
        ...newCustomer,
        insurance_activated_date: convertDate(newCustomer.insurance_activated_date),
        renewal_date: convertDate(newCustomer.renewal_date),
        od_expiry_date: convertDate(newCustomer.od_expiry_date),
        tp_expiry_date: convertDate(newCustomer.tp_expiry_date),
        premium: parseFloat(newCustomer.premium) || 0
      });
      console.log('Customer added, syncing to sheet...');
      try {
        await api.post('/api/insurance/sync/to-sheet', {
          tabName: SHEET_TAB_NAME
        });
        console.log('Sync to sheet successful');
      } catch (syncError) {
        console.error('Sync to sheet failed:', syncError);
        alert('Customer added but sync to sheet failed. Check console.');
      }
      setShowAddModal(false);
      setNewCustomer({
        name: '',
        mobile_number: '',
        insurance_activated_date: '',
        renewal_date: '',
        od_expiry_date: '',
        tp_expiry_date: '',
        premium_mode: '',
        premium: '',
        last_year_premium: '',
        vertical: 'motor',
        product: '',
        registration_no: '',
        current_policy_no: '',
        company: '',
        status: 'pending',
        new_policy_no: '',
        new_company: '',
        policy_doc_link: '',
        thank_you_sent: '',
        reason: '',
        email: '',
        cheque_hold: '',
        payment_date: '',
        cheque_no: '',
        cheque_bounce: '',
        owner_alert_sent: ''
      });
      loadData();
    } catch (error) {
      console.error('Failed to add customer:', error);
      alert('Failed to add customer');
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;
    
    try {
      const convertDate = (date: string) => {
        if (!date) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          const [year, month, day] = date.split('-');
          return `${day}/${month}/${year}`;
        }
        return date;
      };
      
      console.log('Updating customer:', editingCustomer.id);
      await api.put(`/api/insurance/customers/${editingCustomer.id}`, {
        ...editingCustomer,
        insurance_activated_date: convertDate(editingCustomer.insurance_activated_date),
        renewal_date: convertDate(editingCustomer.renewal_date),
        od_expiry_date: convertDate(editingCustomer.od_expiry_date),
        tp_expiry_date: convertDate(editingCustomer.tp_expiry_date)
      });
      console.log('Customer updated, syncing to sheet...');
      
      try {
        await api.post('/api/insurance/sync/to-sheet', {
          tabName: SHEET_TAB_NAME
        });
        console.log('Sync successful');
      } catch (syncError) {
        console.error('Sync failed but customer updated:', syncError);
        alert('Customer updated but sync to sheet failed');
      }
      
      setEditingCustomer(null);
      loadData();
    } catch (error) {
      console.error('Failed to update customer:', error);
      alert('Failed to update customer: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      await api.delete(`/api/insurance/customers/${id}`);
      await api.post('/api/insurance/sync/to-sheet', {
        tabName: SHEET_TAB_NAME
      });
      loadData();
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const syncFromSheets = async (silent = false) => {
    try {
      setSyncing(true);
      const result = await api.post('/api/insurance/sync/from-sheet', {
        tabName: SHEET_TAB_NAME
      });
      if (!silent) {
        alert(`Sync completed! Imported: ${result.data.imported}`);
      }
      loadData();
    } catch (error) {
      console.error('Failed to sync from sheets:', error);
      if (!silent) {
        alert('Sync failed. Please check your Google Sheets connection.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.mobile_number.includes(searchTerm) ||
      customer.registration_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || customer.status.trim().toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'customers':
        return renderCustomersTab();
      case 'policies':
        return renderPoliciesTab();
      case 'renewals':
        return renderRenewalsTab();
      default:
        return renderDashboardTab();
    }
  };

  const renderDashboardTab = () => {
    const { overdue, expiring7, expiring30 } = categorizeCustomers();
    const todayTasks = [...overdue, ...expiring7];
    
    return (
      <div className="space-y-6">
        {/* Stats */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-sm text-slate-400">Total Customers</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">{analytics.totalCustomers}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-sm text-slate-400">Upcoming Renewals</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">{analytics.upcomingRenewals}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-sm text-slate-400">Expired Policies</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">{analytics.expiredPolicies || 0}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-sm text-slate-400">Total Premium</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">₹{analytics.totalPremium?.toLocaleString() || 0}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            ⚡ Quick Actions - Today's Priority
          </h3>
          
          {todayTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-lg">✅ All caught up! No urgent tasks today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.slice(0, 5).map(customer => {
                const daysLeft = getDaysUntilExpiry(customer);
                const isOverdue = daysLeft < 0;
                const displayDate = getDisplayDate(customer);
                
                return (
                  <div key={customer.id} className={`p-4 rounded-lg border ${
                    isOverdue ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'
                  } flex items-center justify-between`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{isOverdue ? '🔴' : '🟠'}</span>
                        <div>
                          <h4 className="font-medium text-white">{customer.name}</h4>
                          <p className="text-sm text-slate-300">{customer.registration_no} - {customer.company}</p>
                          <p className="text-xs text-slate-400">Renewal: {displayDate}</p>
                          <p className={`text-sm font-medium mt-1 ${
                            isOverdue ? 'text-red-400' : 'text-orange-400'
                          }`}>
                            {isOverdue ? `Overdue by ${Math.abs(daysLeft)} days` : `Expires in ${daysLeft} days`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg">₹{customer.premium?.toLocaleString()}</span>
                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => alert('🔒 Premium Feature\n\nUpgrade to Voice Bot Premium to enable automated calling feature.\n\nContact support to upgrade.')}
                          title="Call Customer (Premium)"
                          className="opacity-60"
                        >
                          📞 🔒
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const days = getDaysUntilExpiry(customer);
                            const displayDate = getDisplayDate(customer);
                            const isDone = customer.status.trim().toLowerCase() === 'done';
                            let message = '';
                            
                            if (isDone && days < 0) {
                              message = `Dear ${customer.name},\n\nThank you for renewing your insurance policy with us! 🎉\n\nYour policy is now active and you are covered.\n\nWe appreciate your trust in KMG Insurance Agency.\n\nFor any assistance, feel free to contact us anytime.\n\nThank you!`;
                            } else if (days < 0) {
                              message = `Dear ${customer.name},\n\nYour insurance policy has expired on ${displayDate}. Please renew it immediately to avoid any inconvenience.\n\nFor renewal assistance, contact KMG Insurance Agency.\n\nThank you!`;
                            } else if (days === 0 || days === 1) {
                              message = `🚨 URGENT REMINDER 🚨\n\nDear ${customer.name},\n\nYour insurance policy expires TOMORROW (${displayDate})! Please renew immediately to avoid policy lapse.\n\nContact KMG Insurance Agency NOW for instant renewal.\n\nThank you!`;
                            } else if (days <= 7) {
                              message = `Dear ${customer.name},\n\nThis is a reminder that your insurance policy will expire on ${displayDate} (in ${days} days).\n\nPlease renew your policy at the earliest to ensure continuous coverage.\n\nKMG Insurance Agency\nYour trusted insurance partner.\n\nThank you!`;
                            } else if (days <= 30) {
                              message = `Dear ${customer.name},\n\nYour insurance policy is due for renewal on ${displayDate} (in ${days} days).\n\nWe recommend renewing early to avoid last-minute hassles.\n\nKMG Insurance Agency is here to assist you.\n\nThank you!`;
                            }
                            window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`);
                          }}
                          title="WhatsApp Customer"
                        >
                          💬
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {todayTasks.length > 5 && (
                <div className="text-center pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/insurance/renewals'}
                  >
                    View All {todayTasks.length} Priority Tasks →
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <h4 className="text-sm text-red-300 mb-2">Overdue Renewals</h4>
            <p className="text-3xl font-bold text-red-400">{overdue.length}</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-3 w-full"
              onClick={() => window.location.href = '/insurance/renewals'}
            >
              Take Action
            </Button>
          </div>
          
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <h4 className="text-sm text-orange-300 mb-2">Expiring in 7 Days</h4>
            <p className="text-3xl font-bold text-orange-400">{expiring7.length}</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-3 w-full"
              onClick={() => window.location.href = '/insurance/renewals'}
            >
              View Details
            </Button>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <h4 className="text-sm text-yellow-300 mb-2">Expiring in 30 Days</h4>
            <p className="text-3xl font-bold text-yellow-400">{expiring30.length}</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-3 w-full"
              onClick={() => window.location.href = '/insurance/renewals'}
            >
              Plan Ahead
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const syncToSheets = async () => {
    try {
      setSyncing(true);
      console.log('Starting sync to sheets...');
      const result = await api.post('/api/insurance/sync/to-sheet', {
        tabName: SHEET_TAB_NAME
      });
      console.log('Sync result:', result.data);
      alert(`Successfully synced ${result.data.exported} customers to Google Sheets!`);
    } catch (error) {
      console.error('Failed to sync to sheets:', error);
      alert('Sync to sheets failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setSyncing(false);
    }
  };

  const renderCustomersTab = () => (
    <>
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <select
          className="p-2 border rounded bg-slate-700 text-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
        <Button 
          onClick={syncFromSheets} 
          disabled={syncing}
          variant="outline"
        >
          {syncing ? 'Syncing...' : '🔄 Sync from Sheets'}
        </Button>
        <Button 
          onClick={syncToSheets} 
          disabled={syncing}
          variant="outline"
        >
          {syncing ? 'Syncing...' : '📤 Sync to Sheets'}
        </Button>
      </div>
      {renderCustomersTable()}
    </>
  );

  const renderPoliciesTab = () => {
    const filteredPolicies = policyTab === 'active' 
      ? customers.filter(c => c.status.trim().toLowerCase() === 'done')
      : policyTab === 'lost'
      ? customers.filter(c => c.status.trim().toLowerCase() === 'lost')
      : policyTab === 'pending'
      ? customers.filter(c => {
          const daysLeft = getDaysUntilExpiry(c);
          return (daysLeft < 0 || daysLeft <= 30) && c.status.trim().toLowerCase() === 'pending';
        })
      : customers;

    return (
    <div className="space-y-6">
      {/* Policy Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          className={`px-4 py-2 font-medium ${policyTab === 'active' ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-400'}`}
          onClick={() => { setPolicyTab('active'); localStorage.setItem('insurancePolicyTab', 'active'); }}
        >
          Active Policies ({analytics?.activePolicies || 0})
        </button>
        <button
          className={`px-4 py-2 font-medium ${policyTab === 'pending' ? 'text-red-400 border-b-2 border-red-400' : 'text-slate-400'}`}
          onClick={() => { setPolicyTab('pending'); localStorage.setItem('insurancePolicyTab', 'pending'); }}
        >
          Pending Policies ({analytics?.expiredPolicies || 0})
        </button>
        <button
          className={`px-4 py-2 font-medium ${policyTab === 'total' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
          onClick={() => { setPolicyTab('total'); localStorage.setItem('insurancePolicyTab', 'total'); }}
        >
          Total Policies ({analytics?.totalPolicies || 0})
        </button>
        <button
          className={`px-4 py-2 font-medium ${policyTab === 'lost' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-slate-400'}`}
          onClick={() => { setPolicyTab('lost'); localStorage.setItem('insurancePolicyTab', 'lost'); }}
        >
          Lost Policies ({analytics?.lostPolicies || 0})
        </button>
      </div>

      {/* Policy Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
          <h4 className="font-medium text-slate-100 mb-2">Active Policies</h4>
          <p className="text-2xl font-bold text-green-400">{analytics?.activePolicies || 0}</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
          <h4 className="font-medium text-slate-100 mb-2">Lost Policies</h4>
          <p className="text-2xl font-bold text-red-400">{analytics?.lostPolicies || 0}</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
          <h4 className="font-medium text-slate-100 mb-2">Expiring Soon</h4>
          <p className="text-2xl font-bold text-orange-400">{analytics?.expiringPolicies || 0}</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
          <h4 className="font-medium text-slate-100 mb-2">Total Premium</h4>
          <p className="text-2xl font-bold text-blue-400">₹{customers.reduce((sum, c) => sum + (c.premium || 0), 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Company-wise Breakdown */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Company-wise Policies</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(
            customers.reduce((acc, customer) => {
              const company = customer.company || 'Unknown';
              if (!acc[company]) acc[company] = { count: 0, premium: 0 };
              acc[company].count++;
              acc[company].premium += customer.premium || 0;
              return acc;
            }, {})
          ).map(([company, data]) => (
            <div key={company} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="font-medium text-white mb-2">{company}</h4>
              <p className="text-sm text-slate-300">{data.count} policies</p>
              <p className="text-lg font-bold text-cyan-400">₹{data.premium.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Policy List */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">{policyTab === 'active' ? 'Active' : policyTab === 'pending' ? 'Pending' : policyTab === 'lost' ? 'Lost' : 'All'} Policies</h3>
        <div className="space-y-3">
          {filteredPolicies.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No policies found</p>
          ) : (
            filteredPolicies.map(customer => (
              <div key={customer.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <div>
                  <h4 className="font-medium text-white">{customer.name}</h4>
                  <p className="text-sm text-slate-300">{customer.registration_no} - {customer.company}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-300">Expires: {customer.renewal_date}</p>
                  <p className="font-bold text-cyan-400">₹{customer.premium}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${customer.status === 'done' ? 'bg-green-500/20 text-green-300' : customer.status === 'lost' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                    {customer.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    );
  };



  const renderRenewalsTab = () => {
    const { overdue, expiring7, expiring30, renewed } = categorizeCustomers();
    
    return (
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <h4 className="text-sm text-red-300 mb-1">Overdue</h4>
            <p className="text-3xl font-bold text-red-400">{overdue.length}</p>
          </div>
          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <h4 className="text-sm text-orange-300 mb-1">Expiring in 7 Days</h4>
            <p className="text-3xl font-bold text-orange-400">{expiring7.length}</p>
          </div>
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <h4 className="text-sm text-yellow-300 mb-1">Expiring in 30 Days</h4>
            <p className="text-3xl font-bold text-yellow-400">{expiring30.length}</p>
          </div>
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <h4 className="text-sm text-green-300 mb-1">Reminders Sent Today</h4>
            <p className="text-3xl font-bold text-green-400">{renewalStats.reminders_today}</p>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCustomers.length > 0 && (() => {
          const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id));
          const allPending = selectedCustomerData.every(c => c.status.trim().toLowerCase() === 'pending');
          const allDone = selectedCustomerData.every(c => c.status.trim().toLowerCase() === 'done');
          
          let buttonText = 'Toggle Status';
          if (allPending) buttonText = 'Mark as Renewed';
          else if (allDone) buttonText = 'Mark as Pending';
          
          return (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex justify-between items-center">
              <p className="text-white font-medium">{selectedCustomers.length} customers selected</p>
              <Button onClick={handleBulkStatusToggle}>{buttonText}</Button>
            </div>
          );
        })()}

        {/* Overdue */}
        {overdue.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-red-400">🔴 Overdue ({overdue.length})</h3>
            <div className="space-y-3">
              {overdue.map(c => renderRenewalCard(c, `Overdue by ${Math.abs(getDaysUntilExpiry(c))} days`, 'border-red-500/50'))}
            </div>
          </div>
        )}

        {/* Expiring in 7 Days */}
        {expiring7.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-orange-400">🟠 Expiring in 7 Days ({expiring7.length})</h3>
            <div className="space-y-3">
              {expiring7.map(c => renderRenewalCard(c, `${getDaysUntilExpiry(c)} days left`, 'border-orange-500/50'))}
            </div>
          </div>
        )}

        {/* Expiring in 30 Days */}
        {expiring30.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">🟡 Expiring in 30 Days ({expiring30.length})</h3>
            <div className="space-y-3">
              {expiring30.map(c => renderRenewalCard(c, `${getDaysUntilExpiry(c)} days left`, 'border-yellow-500/50'))}
            </div>
          </div>
        )}

        {/* Recently Renewed */}
        {renewed.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-green-400">🟢 Recently Renewed ({renewed.slice(0, 10).length})</h3>
            <div className="space-y-3">
              {renewed.slice(0, 10).map(c => renderRenewalCard(c, 'Renewed', 'border-green-500/50', true))}
            </div>
          </div>
        )}

        {/* Add Note Modal */}
        <Modal open={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add Note">
          <div className="space-y-4">
            <textarea
              className="w-full p-3 border rounded bg-slate-700 text-white min-h-[100px]"
              placeholder="Add note about customer interaction..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-3">
              <Button onClick={handleAddNote}>Save Note</Button>
              <Button variant="outline" onClick={() => setShowNoteModal(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>

        {/* History Modal */}
        <Modal open={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Customer History">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {customerHistory.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <div className="flex justify-between items-start">
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.type === 'note' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'
                  }`}>
                    {item.type === 'note' ? '📝 Note' : '📧 Reminder'}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-white mt-2">{item.content}</p>
              </div>
            ))}
          </div>
        </Modal>
      </div>
    );
  };



  const renderCustomersTable = () => {
    const isMotor = verticalFilter === 'motor';
    
    return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">Mobile</th>
              {isMotor && <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">Vehicle</th>}
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">Renewal Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">Premium</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-slate-700/30">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {customer.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                  {customer.mobile_number}
                </td>
                {isMotor && <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                  {customer.registration_no}
                </td>}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                  {getDisplayDate(customer)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                  ₹{customer.premium}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    customer.status === 'active' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                    customer.status === 'paid' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    'bg-slate-500/20 text-slate-200 border border-slate-500/30'
                  }`}>
                    {customer.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingCustomer(customer)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteCustomer(customer.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    );
  };

  const getPageTitle = () => {
    switch (currentTab) {
      case 'customers': return 'Customer Management';
      case 'policies': return 'Policy Overview';
      case 'renewals': return 'Upcoming Renewals';
      default: return 'Insurance Agency Dashboard';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">{getPageTitle()}</h1>
        <div className="flex gap-3 items-center">
          {currentTab === 'customers' && (
            <Button onClick={() => setShowAddModal(true)}>
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {renderTabContent()}

      {/* Add Customer Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add New Customer ${clientConfig ? `(${clientConfig.clientName})` : ''}`}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <Input placeholder="Name" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} required />
          <Input placeholder="Mobile Number" value={newCustomer.mobile_number} onChange={(e) => setNewCustomer({...newCustomer, mobile_number: e.target.value})} required />
          <Input type="email" placeholder="Email" value={newCustomer.email} onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} />
          <Input placeholder="Product" value={newCustomer.product} onChange={(e) => setNewCustomer({...newCustomer, product: e.target.value})} />
          <select className="w-full p-2 border rounded bg-slate-700 text-white" value={newCustomer.vertical} onChange={(e) => setNewCustomer({...newCustomer, vertical: e.target.value})}>
            <option value="motor">🚗 Motor</option>
            <option value="health">🏥 Health</option>
            <option value="non-motor">🏠 Non-Motor</option>
            <option value="life">👤 Life</option>
          </select>
          <Input placeholder={isJoban ? "Policy No" : "Current Policy No"} value={newCustomer.current_policy_no} onChange={(e) => setNewCustomer({...newCustomer, current_policy_no: e.target.value})} />
          <Input placeholder="Company" value={newCustomer.company} onChange={(e) => setNewCustomer({...newCustomer, company: e.target.value})} />
          <Input placeholder={isJoban ? "REGN no" : "Registration No"} value={newCustomer.registration_no} onChange={(e) => setNewCustomer({...newCustomer, registration_no: e.target.value})} />
          {isJoban && <Input type="number" placeholder="Last Year Premium" value={newCustomer.last_year_premium} onChange={(e) => setNewCustomer({...newCustomer, last_year_premium: e.target.value})} />}
          <Input type="number" placeholder="Premium Amount" value={newCustomer.premium} onChange={(e) => setNewCustomer({...newCustomer, premium: e.target.value})} />
          <Input placeholder="Premium Mode" value={newCustomer.premium_mode} onChange={(e) => setNewCustomer({...newCustomer, premium_mode: e.target.value})} />
          <div><label className="text-sm text-slate-300 mb-1 block">{isJoban ? 'Date of Expiry' : 'Renewal Date'}</label><Input type="date" value={newCustomer.renewal_date} onChange={(e) => setNewCustomer({...newCustomer, renewal_date: e.target.value})} /></div>
          <div><label className="text-sm text-slate-300 mb-1 block">TP Expiry Date</label><Input type="date" value={newCustomer.tp_expiry_date} onChange={(e) => setNewCustomer({...newCustomer, tp_expiry_date: e.target.value})} /></div>
          {!isJoban && <div><label className="text-sm text-slate-300 mb-1 block">OD Expiry Date</label><Input type="date" value={newCustomer.od_expiry_date} onChange={(e) => setNewCustomer({...newCustomer, od_expiry_date: e.target.value})} /></div>}
          <div><label className="text-sm text-slate-300 mb-1 block">{isJoban ? 'Activated Date' : 'Insurance Activated Date'}</label><Input type="date" value={newCustomer.insurance_activated_date} onChange={(e) => setNewCustomer({...newCustomer, insurance_activated_date: e.target.value})} /></div>
          <select className="w-full p-2 border rounded bg-slate-700 text-white" value={newCustomer.status} onChange={(e) => setNewCustomer({...newCustomer, status: e.target.value})}>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
            <option value="lost">Lost</option>
          </select>
          <Input placeholder="ThankYouSent (yes/no)" value={newCustomer.thank_you_sent} onChange={(e) => setNewCustomer({...newCustomer, thank_you_sent: e.target.value})} />
          {isJoban && (
            <>
              <Input placeholder="Cheque Hold" value={newCustomer.cheque_hold} onChange={(e) => setNewCustomer({...newCustomer, cheque_hold: e.target.value})} />
              <div><label className="text-sm text-slate-300 mb-1 block">Payment Date</label><Input type="date" value={newCustomer.payment_date} onChange={(e) => setNewCustomer({...newCustomer, payment_date: e.target.value})} /></div>
              <Input placeholder="Cheque No" value={newCustomer.cheque_no} onChange={(e) => setNewCustomer({...newCustomer, cheque_no: e.target.value})} />
              <Input placeholder="Cheque Bounce" value={newCustomer.cheque_bounce} onChange={(e) => setNewCustomer({...newCustomer, cheque_bounce: e.target.value})} />
            </>
          )}
          <Input placeholder="New Policy No" value={newCustomer.new_policy_no} onChange={(e) => setNewCustomer({...newCustomer, new_policy_no: e.target.value})} />
          <Input placeholder={isJoban ? "New Policy Company" : "New Company"} value={newCustomer.new_company} onChange={(e) => setNewCustomer({...newCustomer, new_company: e.target.value})} />
          <Input placeholder="Policy doc link" value={newCustomer.policy_doc_link} onChange={(e) => setNewCustomer({...newCustomer, policy_doc_link: e.target.value})} />
          {isJoban && <Input placeholder="Owner Alert Sent" value={newCustomer.owner_alert_sent} onChange={(e) => setNewCustomer({...newCustomer, owner_alert_sent: e.target.value})} />}
          {!isJoban && <Input placeholder="Reason" value={newCustomer.reason} onChange={(e) => setNewCustomer({...newCustomer, reason: e.target.value})} />}

          <div className="flex gap-3">
            <Button onClick={handleAddCustomer}>Add Customer</Button>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        open={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        title="Edit Customer"
      >
        {editingCustomer && (
          <div className="space-y-3 max-h-[75vh] overflow-y-auto p-1">
            <Input placeholder="Name" value={editingCustomer.name || ''} onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})} />
            <Input placeholder="Mobile" value={editingCustomer.mobile_number || ''} onChange={(e) => setEditingCustomer({...editingCustomer, mobile_number: e.target.value})} />
            <Input type="email" placeholder="Email" value={editingCustomer.email || ''} onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})} />
            <Input placeholder="Product" value={editingCustomer.product || ''} onChange={(e) => setEditingCustomer({...editingCustomer, product: e.target.value})} />
            <select className="w-full p-2 border rounded bg-slate-700 text-white" value={editingCustomer.vertical || 'motor'} onChange={(e) => setEditingCustomer({...editingCustomer, vertical: e.target.value})}>
              <option value="motor">🚗 Motor</option>
              <option value="health">🏥 Health</option>
              <option value="non-motor">🏠 Non-Motor</option>
              <option value="life">👤 Life</option>
            </select>
            <Input placeholder={isJoban ? "Policy No" : "Current Policy No"} value={editingCustomer.current_policy_no || ''} onChange={(e) => setEditingCustomer({...editingCustomer, current_policy_no: e.target.value})} />
            <Input placeholder="Company" value={editingCustomer.company || ''} onChange={(e) => setEditingCustomer({...editingCustomer, company: e.target.value})} />
            <Input placeholder={isJoban ? "REGN no" : "Registration No"} value={editingCustomer.registration_no || ''} onChange={(e) => setEditingCustomer({...editingCustomer, registration_no: e.target.value})} />
            {isJoban && <Input type="number" placeholder="Last Year Premium" value={editingCustomer.last_year_premium || ''} onChange={(e) => setEditingCustomer({...editingCustomer, last_year_premium: e.target.value})} />}
            <Input type="number" placeholder="Premium Amount" value={editingCustomer.premium || ''} onChange={(e) => setEditingCustomer({...editingCustomer, premium: parseFloat(e.target.value)})} />
            <Input placeholder="Premium Mode" value={editingCustomer.premium_mode || ''} onChange={(e) => setEditingCustomer({...editingCustomer, premium_mode: e.target.value})} />
            <div><label className="text-sm text-slate-300 mb-1 block">{isJoban ? 'Date of Expiry' : 'Renewal Date'}</label><Input type="date" value={editingCustomer.renewal_date?.includes('/') ? editingCustomer.renewal_date.split('/').reverse().join('-') : editingCustomer.renewal_date || ''} onChange={(e) => setEditingCustomer({...editingCustomer, renewal_date: e.target.value})} /></div>
            <div><label className="text-sm text-slate-300 mb-1 block">TP Expiry</label><Input type="date" value={editingCustomer.tp_expiry_date?.includes('/') ? editingCustomer.tp_expiry_date.split('/').reverse().join('-') : editingCustomer.tp_expiry_date || ''} onChange={(e) => setEditingCustomer({...editingCustomer, tp_expiry_date: e.target.value})} /></div>
            {!isJoban && <div><label className="text-sm text-slate-300 mb-1 block">OD Expiry Date</label><Input type="date" value={editingCustomer.od_expiry_date?.includes('/') ? editingCustomer.od_expiry_date.split('/').reverse().join('-') : editingCustomer.od_expiry_date || ''} onChange={(e) => setEditingCustomer({...editingCustomer, od_expiry_date: e.target.value})} /></div>}
            <div><label className="text-sm text-slate-300 mb-1 block">{isJoban ? 'Activated Date' : 'Insurance Activated Date'}</label><Input type="date" value={editingCustomer.insurance_activated_date?.includes('/') ? editingCustomer.insurance_activated_date.split('/').reverse().join('-') : editingCustomer.insurance_activated_date || ''} onChange={(e) => setEditingCustomer({...editingCustomer, insurance_activated_date: e.target.value})} /></div>
            <select className="w-full p-2 border rounded bg-slate-700 text-white" value={editingCustomer.status || 'pending'} onChange={(e) => setEditingCustomer({...editingCustomer, status: e.target.value})}>
              <option value="pending">Pending</option>
              <option value="done">Done</option>
              <option value="lost">Lost</option>
            </select>
            <Input placeholder="ThankYouSent" value={editingCustomer.thank_you_sent || ''} onChange={(e) => setEditingCustomer({...editingCustomer, thank_you_sent: e.target.value})} />
            {isJoban && (
              <>
                <Input placeholder="Cheque Hold" value={editingCustomer.cheque_hold || ''} onChange={(e) => setEditingCustomer({...editingCustomer, cheque_hold: e.target.value})} />
                <div><label className="text-sm text-slate-300 mb-1 block">Payment Date</label><Input type="date" value={editingCustomer.payment_date?.includes('/') ? editingCustomer.payment_date.split('/').reverse().join('-') : editingCustomer.payment_date || ''} onChange={(e) => setEditingCustomer({...editingCustomer, payment_date: e.target.value})} /></div>
                <Input placeholder="Cheque No" value={editingCustomer.cheque_no || ''} onChange={(e) => setEditingCustomer({...editingCustomer, cheque_no: e.target.value})} />
                <Input placeholder="Cheque Bounce" value={editingCustomer.cheque_bounce || ''} onChange={(e) => setEditingCustomer({...editingCustomer, cheque_bounce: e.target.value})} />
              </>
            )}
            <Input placeholder="New Policy No" value={editingCustomer.new_policy_no || ''} onChange={(e) => setEditingCustomer({...editingCustomer, new_policy_no: e.target.value})} />
            <Input placeholder={isJoban ? "New Policy Company" : "New Company"} value={editingCustomer.new_company || ''} onChange={(e) => setEditingCustomer({...editingCustomer, new_company: e.target.value})} />
            <Input placeholder="Policy doc link" value={editingCustomer.policy_doc_link || ''} onChange={(e) => setEditingCustomer({...editingCustomer, policy_doc_link: e.target.value})} />
            {isJoban && <Input placeholder="Owner Alert Sent" value={editingCustomer.owner_alert_sent || ''} onChange={(e) => setEditingCustomer({...editingCustomer, owner_alert_sent: e.target.value})} />}
            {!isJoban && <Input placeholder="Reason" value={editingCustomer.reason || ''} onChange={(e) => setEditingCustomer({...editingCustomer, reason: e.target.value})} />}
            <div className="flex gap-3">
              <Button onClick={handleUpdateCustomer}>Update Customer</Button>
              <Button variant="outline" onClick={() => setEditingCustomer(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
