import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ActivityFeed from '../components/ActivityFeed';
import ProfileActivity from '../components/dashboard/ProfileActivity';
import CustomerTable from '../components/CustomerTable';
import { api } from '../lib/api';
import { generateRenewalReminder, generateThankYouMessage, generatePolicyDetailsMessage } from '../utils/whatsappTemplates';

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
  pendingPolicies?: number;
  totalPremium?: number;
}

export default function InsuranceDashboard() {
  const location = useLocation();
  const [verticalFilter, setVerticalFilter] = useState(() => {
    return localStorage.getItem('insuranceVerticalFilter') || 'all'
  });
  const [generalSubFilter, setGeneralSubFilter] = useState(() => {
    return localStorage.getItem('insuranceGeneralSubFilter') || 'all'
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const clientKey = user?.email?.toLowerCase().includes('joban') ? 'joban' : 'kmg';
  const [clientConfig, setClientConfig] = useState<any>(null);
  const [sheetFields, setSheetFields] = useState<string[]>([]);
  const isJoban = user?.email?.toLowerCase().includes('joban') || false;
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [renewalStats, setRenewalStats] = useState({ reminders_today: 0, customers_reminded: 0 });
  const [renewalFilter, setRenewalFilter] = useState({ name: '', company: '', dateFrom: '', dateTo: '' });
  const [showRenewalFilter, setShowRenewalFilter] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteCustomerId, setNoteCustomerId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showMessageHistoryModal, setShowMessageHistoryModal] = useState(false);
  const [messageHistory, setMessageHistory] = useState<any[]>([]);
  const [messageHistoryCustomerId, setMessageHistoryCustomerId] = useState<number | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsModalTitle, setDetailsModalTitle] = useState('');
  const [detailsModalCustomers, setDetailsModalCustomers] = useState<Customer[]>([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [policyTab, setPolicyTab] = useState<'active' | 'total' | 'lost' | 'pending'>(() => {
    const saved = localStorage.getItem('insurancePolicyTab');
    if (saved && ['active', 'total', 'lost', 'pending'].includes(saved)) {
      return saved as 'active' | 'total' | 'lost' | 'pending';
    }
    return 'active';
  });
  const [showAllOverdue, setShowAllOverdue] = useState(false);
  const [showAllToday, setShowAllToday] = useState(false);
  const [showAllTomorrow, setShowAllTomorrow] = useState(false);
  const [showAll7Days, setShowAll7Days] = useState(false);
  const [showAll15Days, setShowAll15Days] = useState(false);
  const [showAll30Days, setShowAll30Days] = useState(false);
  const [showAllRenewed, setShowAllRenewed] = useState(false);
  const [showAllCustomers, setShowAllCustomers] = useState(false);

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
    email: '',
    current_policy_no: '',
    company: '',
    premium: '',
    premium_mode: '',
    renewal_date: '',
    payment_date: '',
    status: 'pending',
    thank_you_sent: '',
    vertical: 'general',
    registration_no: '',
    last_year_premium: '',
    od_expiry_date: '',
    tp_expiry_date: '',
    new_policy_no: '',
    new_company: '',
    product: '',
    notes: '',
    g_code: '',
    modified_expiry_date: '',
    type: '',
    chq_no_date: '',
    bank_name: '',
    customer_id: '',
    agent_code: '',
    amount: '',
    veh_type: '',
    pancard: '',
    aadhar_card: '',
    others: '',
    ag: '',
    pol: '',
    pt: '',
    ppt: '',
    md: '',
    br: '',
    summ: '',
    payment_type: '',
    phone_call: '',
    sort: '',
    com: '',
    i_magic: '',
    true_field: '',
    prev_status: '',
    prev_rank: '',
    fam_earliest: '',
    fc: ''
  });

  useEffect(() => {
    loadClientConfig();
    loadData();
    
    const handleVerticalChange = (e: any) => {
      setVerticalFilter(e.detail);
      localStorage.setItem('insuranceVerticalFilter', e.detail);
    };
    
    const handleGeneralSubFilterChange = (e: any) => {
      setGeneralSubFilter(e.detail);
      localStorage.setItem('insuranceGeneralSubFilter', e.detail);
    };
    
    window.addEventListener('insuranceVerticalChange', handleVerticalChange);
    window.addEventListener('insuranceGeneralSubFilterChange', handleGeneralSubFilterChange);
    
    return () => {
      window.removeEventListener('insuranceVerticalChange', handleVerticalChange);
      window.removeEventListener('insuranceGeneralSubFilterChange', handleGeneralSubFilterChange);
    };
  }, []);

  useEffect(() => {
    if (currentTab === 'renewals') {
      loadRenewalStats();
    }
  }, [currentTab]);

  // Auto-sync from sheets every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      syncFromSheets(true);
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadData();
  }, [verticalFilter, generalSubFilter]);



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
    if (!renewalDate || renewalDate.trim() === '') return 999;
    
    // Handle DD/MM/YYYY format
    if (renewalDate.includes('/')) {
      const parts = renewalDate.split('/');
      if (parts.length !== 3) return 999;
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      if (isNaN(day) || isNaN(month) || isNaN(year)) return 999;
      const expiry = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);
      const diffTime = expiry.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 999;
  };

  const categorizeCustomers = () => {
    let filtered = customers;
    
    if (renewalFilter.name) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(renewalFilter.name.toLowerCase()));
    }
    if (renewalFilter.company) {
      filtered = filtered.filter(c => c.company.toLowerCase().includes(renewalFilter.company.toLowerCase()));
    }
    if (renewalFilter.dateFrom) {
      filtered = filtered.filter(c => {
        const renewalDate = getDisplayDate(c);
        if (!renewalDate) return false;
        const [d, m, y] = renewalDate.split('/');
        const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const from = new Date(renewalFilter.dateFrom);
        return date >= from;
      });
    }
    if (renewalFilter.dateTo) {
      filtered = filtered.filter(c => {
        const renewalDate = getDisplayDate(c);
        if (!renewalDate) return false;
        const [d, m, y] = renewalDate.split('/');
        const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const to = new Date(renewalFilter.dateTo);
        return date <= to;
      });
    }
    
    const overdue = filtered.filter(c => getDaysUntilExpiry(c) < 0 && c.status.trim().toLowerCase() === 'due');
    const expiringToday = filtered.filter(c => getDaysUntilExpiry(c) === 0 && c.status.trim().toLowerCase() === 'due');
    const expiring1Day = filtered.filter(c => getDaysUntilExpiry(c) === 1 && c.status.trim().toLowerCase() === 'due');
    const expiring7 = filtered.filter(c => {
      const days = getDaysUntilExpiry(c);
      return days >= 2 && days <= 7 && c.status.trim().toLowerCase() === 'due';
    });
    const expiring15 = filtered.filter(c => {
      const days = getDaysUntilExpiry(c);
      return days > 7 && days <= 15 && c.status.trim().toLowerCase() === 'due';
    });
    const expiring30 = filtered.filter(c => {
      const days = getDaysUntilExpiry(c);
      return days > 15 && days <= 30 && c.status.trim().toLowerCase() === 'due';
    });
    const renewed = filtered.filter(c => c.status.trim().toLowerCase() === 'renewed');
    
    return { overdue, expiringToday, expiring1Day, expiring7, expiring15, expiring30, renewed };
  };

  const handleBulkStatusToggle = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select customers');
      return;
    }
    
    // Check if all selected customers have the same status
    const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id));
    const allPending = selectedCustomerData.every(c => c.status.trim().toLowerCase() === 'due');
    const allDone = selectedCustomerData.every(c => c.status.trim().toLowerCase() === 'renewed');
    
    let newStatus = '';
    let action = '';
    
    if (allPending) {
      newStatus = 'renewed';
      action = 'renewed';
    } else if (allDone) {
      newStatus = 'due';
      action = 'marked as due';
    } else {
      // Mixed statuses - ask user
      const confirmAction = confirm('Selected customers have mixed statuses. Mark all as Renewed?');
      newStatus = confirmAction ? 'renewed' : 'due';
      action = confirmAction ? 'renewed' : 'marked as due';
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
      if (newStatus === 'renewed' && confirm('Send Thank You messages via WhatsApp to renewed customers?')) {
        selectedCustomerData.forEach(customer => {
          const message = generateThankYouMessage({ 
            customerName: customer.name, 
            renewalDate: getDisplayDate(customer),
            policyNumber: customer.current_policy_no,
            companyName: customer.company,
            premiumAmount: customer.premium?.toString()
          });
          window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
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
      
      // Sync to Google Sheets
      try {
        await api.post('/api/insurance/sync/to-sheet', {
          tabName: SHEET_TAB_NAME
        });
      } catch (syncError) {
        console.error('Sync to sheet failed:', syncError);
      }
      
      setShowNoteModal(false);
      setNote('');
      setNoteCustomerId(null);
      loadData(); // Reload data to show updated notes
      alert('Note added and synced successfully');
    } catch (error) {
      console.error('Failed to add note:', error);
      alert('Failed to add note');
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

  const viewMessageHistory = async (customerId: number) => {
    try {
      const res = await api.get(`/api/insurance/customers/${customerId}/messages`);
      setMessageHistory(res.data);
      setMessageHistoryCustomerId(customerId);
      setShowMessageHistoryModal(true);
    } catch (error) {
      console.error('Failed to load message history:', error);
    }
  };

  const logWhatsAppMessage = async (customerId: number, customerName: string, message: string) => {
    try {
      await api.post('/api/insurance/log-message-frontend', {
        customer_id: customerId,
        customer_name: customerName,
        message_type: 'renewal_reminder',
        channel: 'whatsapp',
        message_content: message,
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log message:', error);
      // Don't let logging errors break the WhatsApp flow
    }
  };

  const toggleCustomerSelection = (id: number) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const renderRenewalCard = (customer: Customer, daysLabel: string, colorClass: string, isRenewed: boolean = false) => (
    <div key={customer.id} className={`p-3 bg-slate-700/50 rounded-lg border ${colorClass}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selectedCustomers.includes(customer.id)}
          onChange={() => toggleCustomerSelection(customer.id)}
          className="w-4 h-4 flex-shrink-0 mt-1"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white text-sm">{customer.name}</h4>
          <p className="text-xs text-slate-300">{customer.registration_no} - {customer.company}</p>
          <p className="text-xs font-medium mt-1 text-slate-400">{daysLabel}</p>
          <p className="font-bold text-white text-base mt-1">₹{customer.premium?.toLocaleString()}</p>
        </div>
        <div className="hidden md:flex gap-2 flex-shrink-0">
          <button
            className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-700 transition-all opacity-60"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              alert('🔒 Premium Feature\n\nUpgrade to Voice Bot Premium to enable automated calling.\n\nContact support to upgrade.');
            }}
            title="Premium Feature"
          >
            📞🔒
          </button>
          <button
            className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-700 transition-all"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              let message = '';
              
              const displayDate = getDisplayDate(customer);
              const days = getDaysUntilExpiry(customer);
              
              if (isRenewed) {
                message = generateThankYouMessage({ 
                  customerName: customer.name, 
                  renewalDate: displayDate,
                  policyNumber: customer.current_policy_no,
                  companyName: customer.company,
                  premiumAmount: customer.premium?.toString(),
                  clientKey
                });
              } else {
                message = generateRenewalReminder({ 
                  customerName: customer.name, 
                  renewalDate: displayDate, 
                  daysRemaining: days,
                  policyNumber: customer.current_policy_no,
                  companyName: customer.company,
                  premiumAmount: customer.premium?.toString(),
                  clientKey
                });
              }
              logWhatsAppMessage(customer.id, customer.name, message);
              window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
            }}
          >
            💬
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-700 transition-all"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setNoteCustomerId(customer.id);
              setShowNoteModal(true);
            }}
            title="Add Note/Report"
          >
            📝
          </button>
          <button
            className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-700 transition-all"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              viewMessageHistory(customer.id);
            }}
            title="Message History"
          >
            📨
          </button>
        </div>
      </div>
      <div className="flex md:hidden flex-wrap gap-2 mt-3">
        <button
          className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-700 transition-all opacity-60 flex-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            alert('🔒 Premium Feature\n\nUpgrade to Voice Bot Premium to enable automated calling.\n\nContact support to upgrade.');
          }}
          title="Premium Feature"
        >
          📞🔒
        </button>
        <button
          className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-700 transition-all flex-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            let message = '';
            
            const displayDate = getDisplayDate(customer);
            const days = getDaysUntilExpiry(customer);
            
            if (isRenewed) {
              message = generateThankYouMessage({ 
                customerName: customer.name, 
                renewalDate: displayDate,
                policyNumber: customer.current_policy_no,
                companyName: customer.company,
                premiumAmount: customer.premium?.toString(),
                clientKey
              });
            } else {
              message = generateRenewalReminder({ 
                customerName: customer.name, 
                renewalDate: displayDate, 
                daysRemaining: days,
                policyNumber: customer.current_policy_no,
                companyName: customer.company,
                premiumAmount: customer.premium?.toString(),
                clientKey
              });
            }
            logWhatsAppMessage(customer.id, customer.name, message);
            window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
          }}
        >
          💬
        </button>
        <button
          type="button"
          className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-700 transition-all flex-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setNoteCustomerId(customer.id);
            setShowNoteModal(true);
          }}
          title="Add Note/Report"
        >
          📝
        </button>
        <button
          className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-700 transition-all flex-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            viewMessageHistory(customer.id);
          }}
          title="Message History"
        >
          📨
        </button>
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
      let vertical = verticalFilter;
      
      if (verticalFilter === 'general') {
        if (generalSubFilter === 'all') {
          vertical = 'general';
        } else {
          vertical = generalSubFilter;
        }
      }
      
      const verticalParam = `?vertical=${vertical}&generalSubFilter=${generalSubFilter}`;
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
      
      const finalVertical = newCustomer.vertical === 'general' ? 'motor' : newCustomer.vertical;
      
      // renewal_date = modified_expiry_date if exists, else od_expiry_date (DATE OF EXPIRY)
      const finalRenewalDate = newCustomer.modified_expiry_date 
        ? convertDate(newCustomer.modified_expiry_date) 
        : convertDate(newCustomer.renewal_date);
      
      await api.post('/api/insurance/customers', {
        ...newCustomer,
        vertical: finalVertical,
        insurance_activated_date: convertDate(newCustomer.insurance_activated_date),
        renewal_date: finalRenewalDate,
        od_expiry_date: convertDate(newCustomer.renewal_date),
        modified_expiry_date: convertDate(newCustomer.modified_expiry_date),
        tp_expiry_date: convertDate(newCustomer.tp_expiry_date),
        premium: parseFloat(newCustomer.premium) || 0,
        veh_type: newCustomer.veh_type || '',
        notes: newCustomer.notes || ''
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
        email: '',
        current_policy_no: '',
        company: '',
        premium: '',
        premium_mode: '',
        renewal_date: '',
        payment_date: '',
        status: 'pending',
        thank_you_sent: '',
        vertical: 'motor',
        registration_no: '',
        last_year_premium: '',
        od_expiry_date: '',
        tp_expiry_date: '',
        new_policy_no: '',
        new_company: '',
        product: '',
        notes: ''
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
      
      const finalVertical = editingCustomer.vertical === 'general' ? 'motor' : editingCustomer.vertical;
      
      console.log('Updating customer:', editingCustomer.id);
      await api.put(`/api/insurance/customers/${editingCustomer.id}`, {
        ...editingCustomer,
        vertical: finalVertical,
        insurance_activated_date: convertDate(editingCustomer.insurance_activated_date),
        renewal_date: convertDate(editingCustomer.renewal_date),
        od_expiry_date: convertDate(editingCustomer.od_expiry_date),
        modified_expiry_date: convertDate(editingCustomer.modified_expiry_date),
        tp_expiry_date: convertDate(editingCustomer.tp_expiry_date),
        veh_type: editingCustomer.veh_type || '',
        notes: editingCustomer.notes || ''
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
    if (syncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }
    try {
      setSyncing(true);
      console.log('Starting sync from sheets...');
      const result = await api.post('/api/insurance/sync/from-sheet', {
        tabName: SHEET_TAB_NAME
      });
      console.log('Sync result:', result.data);
      if (!silent) {
        alert(`✅ Sync from sheet completed! Imported: ${result.data.imported} customers`);
      }
      await loadData();
    } catch (error) {
      console.error('Failed to sync from sheets:', error);
      if (!silent) {
        alert(`❌ Sync from sheet failed: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.mobile_number.includes(searchTerm) ||
      customer.registration_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || customer.status.trim().toLowerCase() === statusFilter.toLowerCase();
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
    const { overdue, expiringToday, expiring1Day, expiring7 } = categorizeCustomers();
    const todayTasks = [...overdue, ...expiringToday, ...expiring1Day, ...expiring7];
    
    console.log('📊 Dashboard Debug:');
    console.log('Total customers:', customers.length);
    console.log('Overdue:', overdue.length);
    console.log('Expiring today:', expiringToday.length);
    console.log('Expiring 1 day:', expiring1Day.length);
    console.log('Expiring 7 days:', expiring7.length);
    console.log('Today tasks:', todayTasks.length);
    if (customers.length > 0) {
      console.log('Sample customer:', customers[0]);
      console.log('Sample renewal date:', getDisplayDate(customers[0]));
      console.log('Sample days until expiry:', getDaysUntilExpiry(customers[0]));
    }
    
    return (
      <div className="space-y-4">
        {/* Stats */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all" onClick={() => { setDetailsModalTitle('All Customers'); setDetailsModalCustomers(customers); setShowDetailsModal(true); }}>
              <h3 className="text-xs text-slate-400">Total Customers</h3>
              <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">{analytics.totalCustomers}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all" onClick={() => { const upcoming = customers.filter(c => { const days = getDaysUntilExpiry(c); return days >= 0 && days <= 30 && c.status.trim().toLowerCase() === 'due'; }); setDetailsModalTitle('Upcoming Renewals (Next 30 Days)'); setDetailsModalCustomers(upcoming); setShowDetailsModal(true); }}>
              <h3 className="text-xs text-slate-400">Upcoming Renewals</h3>
              <p className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">{analytics.upcomingRenewals}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all" onClick={() => { const expired = customers.filter(c => getDaysUntilExpiry(c) < 0 && c.status.trim().toLowerCase() === 'due'); setDetailsModalTitle('Expired Policies'); setDetailsModalCustomers(expired); setShowDetailsModal(true); }}>
              <h3 className="text-xs text-slate-400">Expired Policies</h3>
              <p className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">{analytics.expiredPolicies || 0}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all" onClick={() => { const renewed = customers.filter(c => c.status.trim().toLowerCase() === 'renewed'); setDetailsModalTitle('Renewed Policies'); setDetailsModalCustomers(renewed); setShowDetailsModal(true); }}>
              <h3 className="text-xs text-slate-400">Total Premium</h3>
              <p className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">₹{analytics.totalPremium?.toLocaleString() || 0}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
          <h3 className="text-base font-semibold mb-3 text-white flex items-center gap-2">
            ⚡ Quick Actions - Today's Priority
          </h3>
          
          {todayTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-lg">✅ All caught up! No urgent tasks today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map(customer => {
                const daysLeft = getDaysUntilExpiry(customer);
                const isOverdue = daysLeft < 0;
                const displayDate = getDisplayDate(customer);
                
                return (
                  <div key={customer.id} className={`p-3 rounded-lg border ${
                    isOverdue ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'
                  } flex items-center justify-between`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{isOverdue ? '🔴' : '🟠'}</span>
                        <div>
                          <h4 className="text-sm font-medium text-white">{customer.name}</h4>
                          <p className="text-xs text-slate-300">{customer.registration_no} - {customer.company}</p>
                          <p className="text-xs text-slate-400">Renewal: {displayDate}</p>
                          <p className={`text-xs font-medium mt-0.5 ${
                            isOverdue ? 'text-red-400' : 'text-orange-400'
                          }`}>
                            {isOverdue ? `Overdue by ${Math.abs(daysLeft)} days` : `Expires in ${daysLeft} days`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-base">₹{customer.premium?.toLocaleString()}</span>
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
                            const isDone = customer.status.trim().toLowerCase() === 'renewed';
                            let message = '';
                            
                            if (isDone) {
                              message = generateThankYouMessage({ 
                                customerName: customer.name, 
                                renewalDate: displayDate,
                                policyNumber: customer.current_policy_no,
                                companyName: customer.company,
                                premiumAmount: customer.premium?.toString(),
                                clientKey
                              });
                            } else {
                              message = generateRenewalReminder({ 
                                customerName: customer.name, 
                                renewalDate: displayDate, 
                                daysRemaining: days,
                                policyNumber: customer.current_policy_no,
                                companyName: customer.company,
                                premiumAmount: customer.premium?.toString(),
                                clientKey
                              });
                            }
                            logWhatsAppMessage(customer.id, customer.name, message);
                            window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
                          }}
                          title="WhatsApp Customer"
                        >
                          💬
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setNoteCustomerId(customer.id);
                            setShowNoteModal(true);
                          }}
                          title="Add Note/Report"
                        >
                          📝
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation();
                            viewMessageHistory(customer.id);
                          }}
                          title="Message History"
                        >
                          📨
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

        {/* Profile Activity */}
        <ProfileActivity />

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 cursor-pointer hover:bg-red-500/20 transition-all" onClick={() => { setDetailsModalTitle('Overdue Renewals'); setDetailsModalCustomers(overdue); setShowDetailsModal(true); }}>
            <h4 className="text-xs text-red-300 mb-1">Overdue Renewals</h4>
            <p className="text-2xl font-bold text-red-400">{overdue.length}</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2 w-full text-xs"
              onClick={(e) => { e.stopPropagation(); setDetailsModalTitle('Overdue Renewals'); setDetailsModalCustomers(overdue); setShowDetailsModal(true); }}
            >
              View Details
            </Button>
          </div>
          
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 cursor-pointer hover:bg-orange-500/20 transition-all" onClick={() => { const all7Days = [...expiringToday, ...expiring1Day, ...expiring7]; setDetailsModalTitle('Expiring in 7 Days'); setDetailsModalCustomers(all7Days); setShowDetailsModal(true); }}>
            <h4 className="text-xs text-orange-300 mb-1">Expiring in 7 Days</h4>
            <p className="text-2xl font-bold text-orange-400">{expiringToday.length + expiring1Day.length + expiring7.length}</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2 w-full text-xs"
              onClick={(e) => { e.stopPropagation(); const all7Days = [...expiringToday, ...expiring1Day, ...expiring7]; setDetailsModalTitle('Expiring in 7 Days'); setDetailsModalCustomers(all7Days); setShowDetailsModal(true); }}
            >
              View Details
            </Button>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 cursor-pointer hover:bg-yellow-500/20 transition-all" onClick={() => { const { expiring15, expiring30 } = categorizeCustomers(); const all30Days = [...expiring15, ...expiring30]; setDetailsModalTitle('Expiring in 30 Days'); setDetailsModalCustomers(all30Days); setShowDetailsModal(true); }}>
            <h4 className="text-xs text-yellow-300 mb-1">Expiring in 30 Days</h4>
            <p className="text-2xl font-bold text-yellow-400">{categorizeCustomers().expiring15.length + categorizeCustomers().expiring30.length}</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2 w-full text-xs"
              onClick={(e) => { e.stopPropagation(); const { expiring15, expiring30 } = categorizeCustomers(); const all30Days = [...expiring15, ...expiring30]; setDetailsModalTitle('Expiring in 30 Days'); setDetailsModalCustomers(all30Days); setShowDetailsModal(true); }}
            >
              View Details
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
      alert(`✅ Sync to sheet completed! Exported: ${result.data.exported} customers`);
    } catch (error) {
      console.error('Failed to sync to sheets:', error);
      alert(`❌ Sync to sheet failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const renderCustomersTab = () => {
    const displayedCustomers = showAllCustomers ? filteredCustomers : filteredCustomers.slice(0, 20);
    
    return (
      <div className="space-y-4">
        <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md z-10 pb-4 pt-2 border border-slate-700/50 rounded-xl mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:max-w-md"
              />
              <select
                className="px-3 py-2 border rounded bg-slate-700 text-white text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="due">Due</option>
                <option value="renewed">Renewed</option>
                <option value="not renewed">Not Renewed</option>
                <option value="inprocess">In Process</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={syncFromSheets} 
                disabled={syncing}
                variant="outline"
                title="Sync from Sheets"
                size="sm"
              >
                {syncing ? 'Syncing...' : '🔄 Sync from Sheets'}
              </Button>
              <Button 
                onClick={syncToSheets} 
                disabled={syncing}
                variant="outline"
                title="Sync to Sheets"
                size="sm"
              >
                {syncing ? 'Syncing...' : '📤 Sync to Sheets'}
              </Button>
              
            </div>
          </div>
        </div>

        <CustomerTable
          customers={displayedCustomers}
          isMotor={verticalFilter === 'motor'}
          onEdit={setEditingCustomer}
          onDelete={handleDeleteCustomer}
          getDisplayDate={getDisplayDate}
        />
        
        {filteredCustomers.length > 20 && (
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => setShowAllCustomers(!showAllCustomers)}>
              {showAllCustomers ? 'Show Less' : `Show All (${filteredCustomers.length - 20} more)`}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderPoliciesTab = () => {
    const filteredPolicies = policyTab === 'active' 
      ? customers.filter(c => c.status.trim().toLowerCase() === 'renewed')
      : policyTab === 'lost'
      ? customers.filter(c => c.status.trim().toLowerCase() === 'not renewed')
      : policyTab === 'pending'
      ? customers.filter(c => {
          const daysLeft = getDaysUntilExpiry(c);
          return (daysLeft < 0 || daysLeft <= 30) && c.status.trim().toLowerCase() === 'due';
        })
      : customers;

    return (
    <div className="space-y-6">
      {/* Policy Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-400 cursor-pointer hover:text-green-300 border border-slate-700 rounded"
          onClick={() => { const activePolicies = customers.filter(c => c.status.trim().toLowerCase() === 'renewed'); setDetailsModalTitle('Active Policies'); setDetailsModalCustomers(activePolicies); setShowDetailsModal(true); }}
        >
          Active ({analytics?.activePolicies || 0})
        </button>
        <button
          className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-400 cursor-pointer hover:text-red-300 border border-slate-700 rounded"
          onClick={() => { const pendingPolicies = customers.filter(c => { const daysLeft = getDaysUntilExpiry(c); return (daysLeft < 0 || daysLeft <= 30) && c.status.trim().toLowerCase() === 'due'; }); setDetailsModalTitle('Pending Policies'); setDetailsModalCustomers(pendingPolicies); setShowDetailsModal(true); }}
        >
          Pending ({analytics?.pendingPolicies || 0})
        </button>
        <button
          className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-400 cursor-pointer hover:text-cyan-300 border border-slate-700 rounded"
          onClick={() => { setDetailsModalTitle('Total Policies'); setDetailsModalCustomers(customers); setShowDetailsModal(true); }}
        >
          Total ({analytics?.totalPolicies || 0})
        </button>
        <button
          className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-400 cursor-pointer hover:text-orange-300 border border-slate-700 rounded"
          onClick={() => { const lostPolicies = customers.filter(c => c.status.trim().toLowerCase() === 'not renewed'); setDetailsModalTitle('Lost Policies'); setDetailsModalCustomers(lostPolicies); setShowDetailsModal(true); }}
        >
          Lost ({analytics?.lostPolicies || 0})
        </button>
      </div>

      {/* Company-wise Breakdown */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
        <h3 className="text-base font-semibold mb-3 text-white">Company-wise Policies</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(
            customers.reduce((acc, customer) => {
              const company = customer.company || 'Unknown';
              if (!acc[company]) acc[company] = { count: 0, premium: 0 };
              acc[company].count++;
              acc[company].premium += customer.premium || 0;
              return acc;
            }, {})
          ).map(([company, data]: [string, any]) => (
            <div key={company} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const companyCustomers = customers.filter(c => c.company === company); setDetailsModalTitle(`${company} - Customers`); setDetailsModalCustomers(companyCustomers); setShowDetailsModal(true); }}>
              <h4 className="text-sm font-medium text-white mb-1">{company}</h4>
              <p className="text-xs text-slate-300">{data.count} policies</p>
              <p className="text-base font-bold text-cyan-400">₹{data.premium.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  };



  const renderRenewalsTab = () => {
    const { overdue, expiringToday, expiring1Day, expiring7, expiring15, expiring30, renewed } = categorizeCustomers();
    
    return (
      <div className="space-y-6">
        {/* Filter and Stats Section */}
        <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md z-10 pb-4 pt-2 border border-slate-700/50 rounded-xl mb-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowRenewalFilter(!showRenewalFilter)} variant="outline">
              {showRenewalFilter ? '✕ Hide Filters' : '🔍 Show Filters'}
            </Button>
          </div>

          {showRenewalFilter && (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Input
                  placeholder="Filter by name"
                  value={renewalFilter.name}
                  onChange={(e) => setRenewalFilter({...renewalFilter, name: e.target.value})}
                  className="text-sm"
                />
                <Input
                  placeholder="Filter by company"
                  value={renewalFilter.company}
                  onChange={(e) => setRenewalFilter({...renewalFilter, company: e.target.value})}
                  className="text-sm"
                />
                <Input
                  type="date"
                  placeholder="From date"
                  value={renewalFilter.dateFrom}
                  onChange={(e) => setRenewalFilter({...renewalFilter, dateFrom: e.target.value})}
                  className="text-sm"
                />
                <Input
                  type="date"
                  placeholder="To date"
                  value={renewalFilter.dateTo}
                  onChange={(e) => setRenewalFilter({...renewalFilter, dateTo: e.target.value})}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => setRenewalFilter({ name: '', company: '', dateFrom: '', dateTo: '' })}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {/* Statistics - Fixed */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg cursor-pointer hover:bg-red-500/20 transition-all" onClick={() => document.getElementById('overdue-section')?.scrollIntoView({ behavior: 'smooth' })}>
            <h4 className="text-xs text-red-300 mb-1">Overdue</h4>
            <p className="text-2xl font-bold text-red-400">{overdue.length}</p>
          </div>
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg cursor-pointer hover:bg-orange-500/20 transition-all" onClick={() => document.getElementById('expiring7-section')?.scrollIntoView({ behavior: 'smooth' })}>
            <h4 className="text-xs text-orange-300 mb-1">Within 7 Days</h4>
            <p className="text-2xl font-bold text-orange-400">{expiringToday.length + expiring1Day.length + expiring7.length}</p>
          </div>
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg cursor-pointer hover:bg-yellow-500/20 transition-all" onClick={() => document.getElementById('expiring30-section')?.scrollIntoView({ behavior: 'smooth' })}>
            <h4 className="text-xs text-yellow-300 mb-1">Within 30 Days</h4>
            <p className="text-2xl font-bold text-yellow-400">{expiring15.length + expiring30.length}</p>
          </div>
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg cursor-pointer hover:bg-green-500/20 transition-all" onClick={() => document.getElementById('renewed-section')?.scrollIntoView({ behavior: 'smooth' })}>
            <h4 className="text-xs text-green-300 mb-1">Renewed</h4>
            <p className="text-2xl font-bold text-green-400">{renewed.length}</p>
          </div>
        </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-4">

        {/* Bulk Actions */}
        {selectedCustomers.length > 0 && (() => {
          const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id));
          const allPending = selectedCustomerData.every(c => c.status.trim().toLowerCase() === 'due');
          const allDone = selectedCustomerData.every(c => c.status.trim().toLowerCase() === 'renewed');
          
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

        {/* Show message if no renewals at all */}
        {overdue.length === 0 && expiringToday.length === 0 && expiring1Day.length === 0 && expiring7.length === 0 && expiring15.length === 0 && expiring30.length === 0 && renewed.length === 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-12 text-center">
            <p className="text-2xl text-slate-400">✅ No renewals to display</p>
            <p className="text-sm text-slate-500 mt-2">All customers are up to date!</p>
          </div>
        )}

        {/* Overdue */}
        {overdue.length > 0 && (
          <div id="overdue-section" className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-red-400">🔴 Overdue ({overdue.length})</h3>
            <div className="space-y-3">
              {overdue.slice(0, showAllOverdue ? overdue.length : 5).map(c => renderRenewalCard(c, `Overdue by ${Math.abs(getDaysUntilExpiry(c))} days`, 'border-red-500/50'))}
            </div>
            {overdue.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setShowAllOverdue(!showAllOverdue)}>
                  {showAllOverdue ? 'Show Less' : `Show All (${overdue.length - 5} more)`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Expiring Today */}
        {expiringToday.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-red-400">🚨 Expiring Today ({expiringToday.length})</h3>
            <div className="space-y-3">
              {expiringToday.slice(0, showAllToday ? expiringToday.length : 5).map(c => renderRenewalCard(c, 'Expires TODAY', 'border-red-500/50'))}
            </div>
            {expiringToday.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setShowAllToday(!showAllToday)}>
                  {showAllToday ? 'Show Less' : `Show All (${expiringToday.length - 5} more)`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Expiring in 1 Day */}
        {expiring1Day.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-orange-400">⚠️ Expiring Tomorrow ({expiring1Day.length})</h3>
            <div className="space-y-3">
              {expiring1Day.slice(0, showAllTomorrow ? expiring1Day.length : 5).map(c => renderRenewalCard(c, 'Expires TOMORROW', 'border-orange-500/50'))}
            </div>
            {expiring1Day.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setShowAllTomorrow(!showAllTomorrow)}>
                  {showAllTomorrow ? 'Show Less' : `Show All (${expiring1Day.length - 5} more)`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Expiring Within 7 Days */}
        {expiring7.length > 0 && (
          <div id="expiring7-section" className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-orange-400">🟠 Expiring Within 7 Days ({expiring7.length})</h3>
            <div className="space-y-3">
              {expiring7.slice(0, showAll7Days ? expiring7.length : 5).map(c => renderRenewalCard(c, `${getDaysUntilExpiry(c)} days left`, 'border-orange-500/50'))}
            </div>
            {expiring7.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setShowAll7Days(!showAll7Days)}>
                  {showAll7Days ? 'Show Less' : `Show All (${expiring7.length - 5} more)`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Expiring Within 15 Days */}
        {expiring15.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-yellow-400">🟡 Expiring Within 15 Days ({expiring15.length})</h3>
            <div className="space-y-3">
              {expiring15.slice(0, showAll15Days ? expiring15.length : 5).map(c => renderRenewalCard(c, `${getDaysUntilExpiry(c)} days left`, 'border-yellow-500/50'))}
            </div>
            {expiring15.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setShowAll15Days(!showAll15Days)}>
                  {showAll15Days ? 'Show Less' : `Show All (${expiring15.length - 5} more)`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Expiring Within 30 Days */}
        {expiring30.length > 0 && (
          <div id="expiring30-section" className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-yellow-400">🟡 Expiring Within 30 Days ({expiring30.length})</h3>
            <div className="space-y-3">
              {expiring30.slice(0, showAll30Days ? expiring30.length : 5).map(c => renderRenewalCard(c, `${getDaysUntilExpiry(c)} days left`, 'border-yellow-500/50'))}
            </div>
            {expiring30.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setShowAll30Days(!showAll30Days)}>
                  {showAll30Days ? 'Show Less' : `Show All (${expiring30.length - 5} more)`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Recently Renewed */}
        {renewed.length > 0 && (
          <div id="renewed-section" className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-green-400">🟢 Recently Renewed ({renewed.length})</h3>
            <div className="space-y-3">
              {renewed.slice(0, showAllRenewed ? renewed.length : 5).map(c => renderRenewalCard(c, 'Renewed', 'border-green-500/50', true))}
            </div>
            {renewed.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setShowAllRenewed(!showAllRenewed)}>
                  {showAllRenewed ? 'Show Less' : `Show All (${renewed.length - 5} more)`}
                </Button>
              </div>
            )}
          </div>
        )}

        </div>
      </div>
    );
  };

  const renderOldRenewalsTab = () => {
    return (
      <div className="space-y-6">
        {/* Add Note Modal */}
        <Modal open={showNoteModal} onClose={() => { setShowNoteModal(false); setNote(''); setNoteCustomerId(null); }} title="Add Note/Report">
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

        {/* Message History Modal */}
        <Modal open={showMessageHistoryModal} onClose={() => setShowMessageHistoryModal(false)} title="Message History">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messageHistory.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No messages sent yet</p>
            ) : (
              messageHistory.map((msg, idx) => (
                <div key={idx} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300">
                      {msg.channel === 'whatsapp' ? '💬 WhatsApp' : msg.channel}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(msg.sent_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-white whitespace-pre-wrap">{msg.message_content}</p>
                </div>
              ))
            )}
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





  const getPageTitle = () => {
    switch (currentTab) {
      case 'customers': return 'Customer Management';
      case 'policies': return 'Policy Overview';
      case 'renewals': return 'Upcoming Renewals';
      default: return 'Insurance Agency Dashboard';
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">{getPageTitle()}</h1>
        <div className="flex gap-3 items-center">
          {currentTab === 'customers' && (
            <Button onClick={() => {
              const defaultVertical = verticalFilter === 'life' ? 'life' : 'general';
              setNewCustomer({
                name: '',
                mobile_number: '',
                email: '',
                current_policy_no: '',
                company: '',
                premium: '',
                premium_mode: '',
                renewal_date: '',
                payment_date: '',
                status: 'due',
                thank_you_sent: '',
                vertical: defaultVertical,
                registration_no: '',
                last_year_premium: '',
                od_expiry_date: '',
                tp_expiry_date: '',
                new_policy_no: '',
                new_company: '',
                product: '',
                notes: '',
                g_code: '',
                modified_expiry_date: '',
                type: '',
                chq_no_date: '',
                bank_name: '',
                customer_id: '',
                agent_code: '',
                amount: '',
                veh_type: '',
                pancard: '',
                aadhar_card: '',
                others: '',
                ag: '',
                pol: '',
                pt: '',
                ppt: '',
                md: '',
                br: '',
                summ: '',
                payment_type: '',
                phone_call: '',
                sort: '',
                com: '',
                i_magic: '',
                true_field: '',
                prev_status: '',
                prev_rank: '',
                fam_earliest: '',
                fc: ''
              });
              setShowAddModal(true);
            }}>
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        {renderTabContent()}
      </div>

      {/* Add Customer Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Customer"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          {verticalFilter === 'all' && (
            <select className="w-full p-2 border rounded bg-slate-700 text-white" value={newCustomer.vertical} onChange={(e) => setNewCustomer({...newCustomer, vertical: e.target.value})}>
              <option value="general">📋 General Insurance</option>
              <option value="life">👤 Life Insurance</option>
            </select>
          )}
          
          {(verticalFilter === 'life' || (verticalFilter === 'all' && newCustomer.vertical === 'life')) ? (
            <>
              <Input placeholder="Name *" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} required />
              <Input type="email" placeholder="Email ID" value={newCustomer.email} onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} />
              <Input placeholder="Mobile Number *" value={newCustomer.mobile_number} onChange={(e) => setNewCustomer({...newCustomer, mobile_number: e.target.value})} required />
              <Input placeholder="Policy No" value={newCustomer.current_policy_no} onChange={(e) => setNewCustomer({...newCustomer, current_policy_no: e.target.value})} />
              <Input placeholder="Insurer" value={newCustomer.company} onChange={(e) => setNewCustomer({...newCustomer, company: e.target.value})} />
              <Input type="number" placeholder="Premium" value={newCustomer.premium} onChange={(e) => setNewCustomer({...newCustomer, premium: e.target.value})} />
              <div><label className="text-sm text-slate-300 mb-1 block">Date of Expiry</label><Input type="date" value={newCustomer.renewal_date} onChange={(e) => setNewCustomer({...newCustomer, renewal_date: e.target.value})} /></div>
              <div><label className="text-sm text-slate-300 mb-1 block">Payment Date</label><Input type="date" value={newCustomer.payment_date} onChange={(e) => setNewCustomer({...newCustomer, payment_date: e.target.value})} /></div>
              <Input placeholder="AG" value={newCustomer.ag} onChange={(e) => setNewCustomer({...newCustomer, ag: e.target.value})} />
              <Input placeholder="POL" value={newCustomer.pol} onChange={(e) => setNewCustomer({...newCustomer, pol: e.target.value})} />
              <Input placeholder="PT" value={newCustomer.pt} onChange={(e) => setNewCustomer({...newCustomer, pt: e.target.value})} />
              <Input placeholder="PPT" value={newCustomer.ppt} onChange={(e) => setNewCustomer({...newCustomer, ppt: e.target.value})} />
              <Input placeholder="MD" value={newCustomer.md} onChange={(e) => setNewCustomer({...newCustomer, md: e.target.value})} />
              <Input placeholder="BR" value={newCustomer.br} onChange={(e) => setNewCustomer({...newCustomer, br: e.target.value})} />
              <Input placeholder="SUMM" value={newCustomer.summ} onChange={(e) => setNewCustomer({...newCustomer, summ: e.target.value})} />
              <Input placeholder="Payment Type" value={newCustomer.payment_type} onChange={(e) => setNewCustomer({...newCustomer, payment_type: e.target.value})} />
              <Input placeholder="Phone Call" value={newCustomer.phone_call} onChange={(e) => setNewCustomer({...newCustomer, phone_call: e.target.value})} />
              <Input placeholder="Sort" value={newCustomer.sort} onChange={(e) => setNewCustomer({...newCustomer, sort: e.target.value})} />
              <Input placeholder="COM" value={newCustomer.com} onChange={(e) => setNewCustomer({...newCustomer, com: e.target.value})} />
              <Input placeholder="I Magic" value={newCustomer.i_magic} onChange={(e) => setNewCustomer({...newCustomer, i_magic: e.target.value})} />
              <Input placeholder="True" value={newCustomer.true_field} onChange={(e) => setNewCustomer({...newCustomer, true_field: e.target.value})} />
              <Input placeholder="FC" value={newCustomer.fc} onChange={(e) => setNewCustomer({...newCustomer, fc: e.target.value})} />
            </>
          ) : (
            <>
              <Input placeholder="Name *" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} required />
              <Input placeholder="Policy No" value={newCustomer.current_policy_no} onChange={(e) => setNewCustomer({...newCustomer, current_policy_no: e.target.value})} />
              <Input placeholder="G Code" value={newCustomer.g_code} onChange={(e) => setNewCustomer({...newCustomer, g_code: e.target.value})} />
              <Input type="number" placeholder="Last Year Premium" value={newCustomer.last_year_premium} onChange={(e) => setNewCustomer({...newCustomer, last_year_premium: e.target.value})} />
              <div><label className="text-sm text-slate-300 mb-1 block">Date of Expiry</label><Input type="date" value={newCustomer.renewal_date} onChange={(e) => setNewCustomer({...newCustomer, renewal_date: e.target.value})} /></div>
              <div><label className="text-sm text-slate-300 mb-1 block">Modified Expiry Date</label><Input type="date" value={newCustomer.modified_expiry_date} onChange={(e) => setNewCustomer({...newCustomer, modified_expiry_date: e.target.value})} /></div>
              <Input placeholder="Company" value={newCustomer.company} onChange={(e) => setNewCustomer({...newCustomer, company: e.target.value})} />
              <Input placeholder="Type" value={newCustomer.type} onChange={(e) => setNewCustomer({...newCustomer, type: e.target.value})} />
              <div><label className="text-sm text-slate-300 mb-1 block">Deposited/Payment Date</label><Input type="date" value={newCustomer.payment_date} onChange={(e) => setNewCustomer({...newCustomer, payment_date: e.target.value})} /></div>
              <Input placeholder="CHQ No & Date" value={newCustomer.chq_no_date} onChange={(e) => setNewCustomer({...newCustomer, chq_no_date: e.target.value})} />
              <Input placeholder="Bank Name" value={newCustomer.bank_name} onChange={(e) => setNewCustomer({...newCustomer, bank_name: e.target.value})} />
              <Input placeholder="Customer ID" value={newCustomer.customer_id} onChange={(e) => setNewCustomer({...newCustomer, customer_id: e.target.value})} />
              <Input placeholder="Agent Code" value={newCustomer.agent_code} onChange={(e) => setNewCustomer({...newCustomer, agent_code: e.target.value})} />
              <Input type="number" placeholder="Amount" value={newCustomer.amount} onChange={(e) => setNewCustomer({...newCustomer, amount: e.target.value})} />
              <Input placeholder="New Policy No" value={newCustomer.new_policy_no} onChange={(e) => setNewCustomer({...newCustomer, new_policy_no: e.target.value})} />
              <Input placeholder="New Policy Company" value={newCustomer.new_company} onChange={(e) => setNewCustomer({...newCustomer, new_company: e.target.value})} />
              <Input placeholder="Product Type" value={newCustomer.veh_type} onChange={(e) => setNewCustomer({...newCustomer, veh_type: e.target.value})} />
              <Input placeholder="Product Model" value={newCustomer.product} onChange={(e) => setNewCustomer({...newCustomer, product: e.target.value})} />
              <Input placeholder="VEH No" value={newCustomer.registration_no} onChange={(e) => setNewCustomer({...newCustomer, registration_no: e.target.value})} />
              <div><label className="text-sm text-slate-300 mb-1 block">TP Expiry Date</label><Input type="date" value={newCustomer.tp_expiry_date} onChange={(e) => setNewCustomer({...newCustomer, tp_expiry_date: e.target.value})} /></div>
              <Input placeholder="Premium Mode" value={newCustomer.premium_mode} onChange={(e) => setNewCustomer({...newCustomer, premium_mode: e.target.value})} />
              <Input type="email" placeholder="Email ID" value={newCustomer.email} onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} />
              <Input placeholder="Mobile No" value={newCustomer.mobile_number} onChange={(e) => setNewCustomer({...newCustomer, mobile_number: e.target.value})} required />
              <Input placeholder="PAN Card" value={newCustomer.pancard} onChange={(e) => setNewCustomer({...newCustomer, pancard: e.target.value})} />
              <Input placeholder="Aadhar Card" value={newCustomer.aadhar_card} onChange={(e) => setNewCustomer({...newCustomer, aadhar_card: e.target.value})} />
              <Input placeholder="Others (VI/DL/PP)" value={newCustomer.others} onChange={(e) => setNewCustomer({...newCustomer, others: e.target.value})} />
            </>
          )}
          
          <select className="w-full p-2 border rounded bg-slate-700 text-white" value={newCustomer.status} onChange={(e) => setNewCustomer({...newCustomer, status: e.target.value})}>
            <option value="due">Due</option>
            <option value="renewed">Renewed</option>
            <option value="not renewed">Not Renewed</option>
            <option value="inprocess">In Process</option>
          </select>
          <Input placeholder="Thank You Message Sent (yes/no)" value={newCustomer.thank_you_sent} onChange={(e) => setNewCustomer({...newCustomer, thank_you_sent: e.target.value})} />
          <textarea className="w-full p-2 border rounded bg-slate-700 text-white" placeholder="Remarks/Notes" value={newCustomer.notes} onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})} rows={3} />

          <div className="flex gap-3">
            <Button onClick={handleAddCustomer}>Add Customer</Button>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Details Modal - Shared across all tabs */}
      <Modal open={showDetailsModal} onClose={() => { setShowDetailsModal(false); setModalSearchTerm(''); }} title={detailsModalTitle}>
        <div className="space-y-3">
          <Input
            placeholder="Search customers by name, mobile, or vehicle..."
            value={modalSearchTerm}
            onChange={(e) => setModalSearchTerm(e.target.value)}
            className="w-full"
          />
          <div className="max-h-96 overflow-y-auto space-y-3">
            {detailsModalCustomers.filter(c => 
              c.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
              c.mobile_number.includes(modalSearchTerm) ||
              c.registration_no.toLowerCase().includes(modalSearchTerm.toLowerCase())
            ).length === 0 ? (
              <p className="text-center text-slate-400 py-8">No customers found</p>
            ) : (
              detailsModalCustomers.filter(c => 
                c.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                c.mobile_number.includes(modalSearchTerm) ||
                c.registration_no.toLowerCase().includes(modalSearchTerm.toLowerCase())
              ).map((customer) => (
              <div key={customer.id} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{customer.name}</h4>
                    <p className="text-sm text-slate-300">{customer.mobile_number}</p>
                    <p className="text-sm text-slate-400">Vehicle: {customer.registration_no}</p>
                    <p className="text-sm text-slate-400">Company: {customer.company}</p>
                    <p className="text-sm text-slate-400">Premium: ₹{customer.premium}</p>
                    <p className="text-sm text-slate-400">Renewal: {getDisplayDate(customer)}</p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                      customer.status === 'renewed' ? 'bg-green-500/20 text-green-300' : 
                      customer.status === 'not renewed' ? 'bg-red-500/20 text-red-300' : 
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {customer.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={(e) => {
                      e.stopPropagation();
                      const message = generatePolicyDetailsMessage({
                        customerName: customer.name,
                        vehicleNumber: customer.registration_no,
                        companyName: customer.company,
                        renewalDate: getDisplayDate(customer),
                        policyNumber: customer.current_policy_no,
                        policyType: customer.vertical,
                        premiumAmount: customer.premium?.toString(),
                        clientKey
                      });
                      logWhatsAppMessage(customer.id, customer.name, message);
                      window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
                    }}>💬</Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setNoteCustomerId(customer.id);
                        setShowNoteModal(true);
                      }} 
                      title="Add Note/Report"
                    >
                      📝
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      </Modal>

      {/* Message History Modal */}
      <Modal open={showMessageHistoryModal} onClose={() => setShowMessageHistoryModal(false)} title="Message History">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messageHistory.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No messages sent yet</p>
          ) : (
            messageHistory.map((msg, idx) => (
              <div key={idx} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300">
                    {msg.channel === 'whatsapp' ? '💬 WhatsApp' : msg.channel}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(msg.sent_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-white whitespace-pre-wrap">{msg.message_content}</p>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Add Note Modal */}
      <Modal open={showNoteModal} onClose={() => { setShowNoteModal(false); setNote(''); setNoteCustomerId(null); }} title="Add Note/Report">
        <div className="space-y-4">
          <textarea
            className="w-full p-3 border rounded bg-slate-700 text-white min-h-[100px]"
            placeholder="Add note about customer interaction, follow-ups, or observations..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-3">
            <Button onClick={handleAddNote}>Save Note</Button>
            <Button variant="outline" onClick={() => { setShowNoteModal(false); setNote(''); setNoteCustomerId(null); }}>Cancel</Button>
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
            {verticalFilter === 'all' && (
              <select className="w-full p-2 border rounded bg-slate-700 text-white" value={editingCustomer.vertical || 'general'} onChange={(e) => setEditingCustomer({...editingCustomer, vertical: e.target.value})}>
                <option value="general">📋 General Insurance</option>
                <option value="life">👤 Life Insurance</option>
              </select>
            )}
            
            <Input placeholder="Name" value={editingCustomer.name || ''} onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})} />
            <Input placeholder="Mobile" value={editingCustomer.mobile_number || ''} onChange={(e) => setEditingCustomer({...editingCustomer, mobile_number: e.target.value})} />
            <Input type="email" placeholder="Email" value={editingCustomer.email || ''} onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})} />
            <Input placeholder="Policy No" value={editingCustomer.current_policy_no || ''} onChange={(e) => setEditingCustomer({...editingCustomer, current_policy_no: e.target.value})} />
            
            {(verticalFilter === 'life' || (verticalFilter === 'all' && editingCustomer.vertical === 'life')) ? (
              <>
                <Input placeholder="Insurer" value={editingCustomer.company || ''} onChange={(e) => setEditingCustomer({...editingCustomer, company: e.target.value})} />
                <Input type="number" placeholder="Premium Amount" value={editingCustomer.premium || ''} onChange={(e) => setEditingCustomer({...editingCustomer, premium: parseFloat(e.target.value)})} />
                <Input placeholder="Premium Mode" value={editingCustomer.premium_mode || ''} onChange={(e) => setEditingCustomer({...editingCustomer, premium_mode: e.target.value})} />
                <div><label className="text-sm text-slate-300 mb-1 block">Date of Expiry</label><Input type="date" value={editingCustomer.renewal_date?.includes('/') ? editingCustomer.renewal_date.split('/').reverse().join('-') : editingCustomer.renewal_date || ''} onChange={(e) => setEditingCustomer({...editingCustomer, renewal_date: e.target.value})} /></div>
                <div><label className="text-sm text-slate-300 mb-1 block">Payment Date</label><Input type="date" value={editingCustomer.payment_date?.includes('/') ? editingCustomer.payment_date.split('/').reverse().join('-') : editingCustomer.payment_date || ''} onChange={(e) => setEditingCustomer({...editingCustomer, payment_date: e.target.value})} /></div>
              </>
            ) : (
              <>
                <Input placeholder="Vehicle No" value={editingCustomer.registration_no || ''} onChange={(e) => setEditingCustomer({...editingCustomer, registration_no: e.target.value})} />
                <Input placeholder="Company" value={editingCustomer.company || ''} onChange={(e) => setEditingCustomer({...editingCustomer, company: e.target.value})} />
                <Input type="number" placeholder="Last Year Premium" value={editingCustomer.last_year_premium || ''} onChange={(e) => setEditingCustomer({...editingCustomer, last_year_premium: e.target.value})} />
                <Input type="number" placeholder="Premium Amount" value={editingCustomer.premium || ''} onChange={(e) => setEditingCustomer({...editingCustomer, premium: parseFloat(e.target.value)})} />
                <div><label className="text-sm text-slate-300 mb-1 block">Date of Expiry</label><Input type="date" value={editingCustomer.renewal_date?.includes('/') ? editingCustomer.renewal_date.split('/').reverse().join('-') : editingCustomer.renewal_date || ''} onChange={(e) => setEditingCustomer({...editingCustomer, renewal_date: e.target.value})} /></div>
                <div><label className="text-sm text-slate-300 mb-1 block">OD Expiry Date</label><Input type="date" value={editingCustomer.od_expiry_date?.includes('/') ? editingCustomer.od_expiry_date.split('/').reverse().join('-') : editingCustomer.od_expiry_date || ''} onChange={(e) => setEditingCustomer({...editingCustomer, od_expiry_date: e.target.value})} /></div>
                <div><label className="text-sm text-slate-300 mb-1 block">TP Expiry</label><Input type="date" value={editingCustomer.tp_expiry_date?.includes('/') ? editingCustomer.tp_expiry_date.split('/').reverse().join('-') : editingCustomer.tp_expiry_date || ''} onChange={(e) => setEditingCustomer({...editingCustomer, tp_expiry_date: e.target.value})} /></div>
                <Input placeholder="Product Model" value={editingCustomer.product || ''} onChange={(e) => setEditingCustomer({...editingCustomer, product: e.target.value})} />
                <Input placeholder="Premium Mode" value={editingCustomer.premium_mode || ''} onChange={(e) => setEditingCustomer({...editingCustomer, premium_mode: e.target.value})} />
                <div><label className="text-sm text-slate-300 mb-1 block">Payment Date</label><Input type="date" value={editingCustomer.payment_date?.includes('/') ? editingCustomer.payment_date.split('/').reverse().join('-') : editingCustomer.payment_date || ''} onChange={(e) => setEditingCustomer({...editingCustomer, payment_date: e.target.value})} /></div>
                <Input placeholder="New Policy No" value={editingCustomer.new_policy_no || ''} onChange={(e) => setEditingCustomer({...editingCustomer, new_policy_no: e.target.value})} />
                <Input placeholder="New Policy Company" value={editingCustomer.new_company || ''} onChange={(e) => setEditingCustomer({...editingCustomer, new_company: e.target.value})} />
              </>
            )}
            
            <select className="w-full p-2 border rounded bg-slate-700 text-white" value={editingCustomer.status || 'due'} onChange={(e) => setEditingCustomer({...editingCustomer, status: e.target.value})}>
              <option value="due">Due</option>
              <option value="renewed">Renewed</option>
              <option value="not renewed">Not Renewed</option>
              <option value="inprocess">In Process</option>
            </select>
            <Input placeholder="Thank You Message Sent" value={editingCustomer.thank_you_sent || ''} onChange={(e) => setEditingCustomer({...editingCustomer, thank_you_sent: e.target.value})} />
            <textarea className="w-full p-2 border rounded bg-slate-700 text-white" placeholder="Remarks/Notes" value={editingCustomer.notes || ''} onChange={(e) => setEditingCustomer({...editingCustomer, notes: e.target.value})} rows={3} />
            
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
