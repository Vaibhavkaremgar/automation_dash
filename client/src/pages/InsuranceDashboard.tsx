import React, { useState, useEffect, useMemo } from 'react';
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

const calculateNextRenewalDate = (expiryDate: string, premiumMode: string) => {
  if (!expiryDate) return '';
  try {
    const [d, m, y] = expiryDate.split('/');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (premiumMode?.toLowerCase().includes('month')) {
      const months = parseInt(premiumMode) || 1;
      date.setMonth(date.getMonth() + months);
    } else {
      const years = parseInt(premiumMode) || 1;
      date.setFullYear(date.getFullYear() + years);
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return expiryDate;
  }
};
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
  product_type: string;
  product_model: string;
  registration_no: string;
  premium: number;
  status: string;
  reason: string;
  vertical: string;
  g_code?: string;
  new_company?: string;
  new_policy_no?: string;
  current_policy_no?: string;
  premium_mode?: string;
  [key: string]: any;
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
  
  // Get is_admin from localStorage (set by ProfileSelection)
  const getIsAdmin = () => {
    if (user?.role === 'admin') return true; // Main dashboard admin
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser.is_admin === 1;
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage:', e);
    }
    return false;
  };
  
  const isAdmin = getIsAdmin();
  const [clientConfig, setClientConfig] = useState<any>(null);
  const [sheetFields, setSheetFields] = useState<string[]>([]);
  const isJoban = user?.email?.toLowerCase().includes('joban') || false;
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [renewalStats, setRenewalStats] = useState({ reminders_today: 0, customers_reminded: 0 });
  const [renewalSearchTerm, setRenewalSearchTerm] = useState('');
  const [searchTimers, setSearchTimers] = useState<{[key: string]: NodeJS.Timeout}>({});
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
  const [showAllInProcess, setShowAllInProcess] = useState(false);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [quickActionsLimit, setQuickActionsLimit] = useState(5);
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, any>>({});
  const [showRenewalUpdateModal, setShowRenewalUpdateModal] = useState(false);
  const [bulkRenewalData, setBulkRenewalData] = useState<Record<number, { payment_date: string; cheque_no: string; bank_name: string; customer_id: string; agent_code: string; amount: string; new_policy_no: string; new_company: string; paid_by: string; remarks: string; status: string }>>({});
  const [deletedCustomers, setDeletedCustomers] = useState<Customer[]>([]);
  const [renewalMonthFilter, setRenewalMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [globalYearFilter, setGlobalYearFilter] = useState(() => {
    return localStorage.getItem('insuranceYearFilter') || new Date().getFullYear().toString();
  });
  const [globalMonthFilter, setGlobalMonthFilter] = useState(() => {
    const stored = localStorage.getItem('insuranceMonthFilter');
    return stored ? JSON.parse(stored) : [];
  });
  const [filterEnabled, setFilterEnabled] = useState(() => {
    const stored = localStorage.getItem('insuranceFilterEnabled');
    return stored ? JSON.parse(stored) : true;
  }); // Track deleted customers for sync
  const [showUniqueCustomersModal, setShowUniqueCustomersModal] = useState(false);
  const [uniqueCustomersSearchTerm, setUniqueCustomersSearchTerm] = useState('');
  const [uniqueCustomersMonthFilter, setUniqueCustomersMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Field name mapping helper
  const mapFieldNameToBackend = (key: string): string => {
    const mappings: Record<string, string> = {
      'email_id': 'email',
      'mobile_no': 'mobile_number',
      'policy_no': 'current_policy_no',
      'veh_no': 'registration_no',
      'type': 'vertical',
      'chq_no_&_date': 'cheque_no',
      'remarks': 'notes'
    };
    return mappings[key] || key;
  };

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
    
    const handleYearFilterChange = (e: any) => {
      setGlobalYearFilter(e.detail);
    };
    
    const handleMonthFilterChange = (e: any) => {
      setGlobalMonthFilter(e.detail);
    };
    
    const handleFilterEnabledChange = (e: any) => {
      setFilterEnabled(e.detail);
      localStorage.setItem('insuranceFilterEnabled', JSON.stringify(e.detail));
    };
    
    window.addEventListener('insuranceVerticalChange', handleVerticalChange);
    window.addEventListener('insuranceGeneralSubFilterChange', handleGeneralSubFilterChange);
    window.addEventListener('insuranceYearFilterChange', handleYearFilterChange);
    window.addEventListener('insuranceMonthFilterChange', handleMonthFilterChange);
    window.addEventListener('insuranceFilterEnabledChange', handleFilterEnabledChange);
    
    return () => {
      window.removeEventListener('insuranceVerticalChange', handleVerticalChange);
      window.removeEventListener('insuranceGeneralSubFilterChange', handleGeneralSubFilterChange);
      window.removeEventListener('insuranceYearFilterChange', handleYearFilterChange);
      window.removeEventListener('insuranceMonthFilterChange', handleMonthFilterChange);
      window.removeEventListener('insuranceFilterEnabledChange', handleFilterEnabledChange);
    };
  }, []);

  // Reload config when vertical filter changes
  useEffect(() => {
    loadClientConfig();
  }, [verticalFilter]);

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

  // Auto-reload data after any customer update to keep Quick Actions in sync
  const reloadDataAfterUpdate = async () => {
    await loadData();
  };

  // Auto-clear search terms after 1 minute
  const handleSearchChange = (searchKey: string, value: string) => {
    // Clear existing timer for this search field
    if (searchTimers[searchKey]) {
      clearTimeout(searchTimers[searchKey]);
    }

    // Update search term
    if (searchKey === 'renewalSearch') {
      setRenewalSearchTerm(value);
    } else if (searchKey === 'customerSearch') {
      setSearchTerm(value);
    } else if (searchKey === 'modalSearch') {
      setModalSearchTerm(value);
    }

    // Set new timer to clear after 1 minute
    if (value) {
      const timer = setTimeout(() => {
        if (searchKey === 'renewalSearch') {
          setRenewalSearchTerm('');
        } else if (searchKey === 'customerSearch') {
          setSearchTerm('');
        } else if (searchKey === 'modalSearch') {
          setModalSearchTerm('');
        }
      }, 60000); // 1 minute

      setSearchTimers(prev => ({ ...prev, [searchKey]: timer }));
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(searchTimers).forEach(timer => clearTimeout(timer));
    };
  }, [searchTimers]);

  useEffect(() => {
    loadData();
  }, [verticalFilter, generalSubFilter, filterEnabled, globalYearFilter, globalMonthFilter]);

  const loadRenewalStats = async () => {
    try {
      const res = await api.get('/api/insurance/renewal-stats');
      setRenewalStats(res.data);
    } catch (error) {
      console.error('Failed to load renewal stats:', error);
    }
  };

  useEffect(() => {
    if (currentTab === 'renewals') {
      loadRenewalStats();
    }
  }, [currentTab]);

  const parseAmount = (value: any): number => {
    if (!value) return 0;
    const str = String(value).replace(/[^0-9.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const getDisplayDate = (customer: Customer) => {
    const modifiedDate = customer.renewal_date?.trim();
    const originalDate = customer.od_expiry_date?.trim();
    return modifiedDate || originalDate || '';
  };

  const applyGlobalFilter = (customersToFilter: Customer[]) => {
    if (!filterEnabled || (globalMonthFilter.length === 0 && !globalYearFilter)) {
      return customersToFilter;
    }
    
    const filterYear = parseInt(globalYearFilter);
    return customersToFilter.filter(c => {
      const dateStr = getDisplayDate(c);
      if (!dateStr) return false;
      try {
        const [d, m, y] = dateStr.split('/');
        const year = parseInt(y);
        const month = String(parseInt(m)).padStart(2, '0');
        
        if (year !== filterYear) return false;
        if (globalMonthFilter.length === 0) return true;
        return globalMonthFilter.includes(month);
      } catch (e) {
        return false;
      }
    });
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
    let filtered = applyGlobalFilter(customers);
    
    // Apply renewal month filter
    if (renewalMonthFilter) {
      const [filterYear, filterMonth] = renewalMonthFilter.split('-');
      filtered = filtered.filter(c => {
        const dateStr = getDisplayDate(c);
        if (!dateStr) return false;
        try {
          const [d, m, y] = dateStr.split('/');
          return y === filterYear && String(parseInt(m)).padStart(2, '0') === filterMonth;
        } catch (e) {
          return false;
        }
      });
    }
    
    if (renewalSearchTerm) {
      const searchLower = renewalSearchTerm.toLowerCase();
      // Prioritize key fields: name, mobile, g_code, registration_no, policy_no, company
      filtered = filtered.filter(c => {
        const keyFields = [
          c.name?.toLowerCase() || '',
          c.mobile_number?.toLowerCase() || '',
          c.g_code?.toLowerCase() || '',
          c.registration_no?.toLowerCase() || '',
          c.current_policy_no?.toLowerCase() || '',
          c.company?.toLowerCase() || ''
        ];
        
        // Check if search term matches any key field
        if (keyFields.some(field => field.includes(searchLower))) {
          return true;
        }
        
        // Fall back to searching all fields
        return Object.values(c).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
      });
    }
    
    const sortByExpiry = (a: Customer, b: Customer) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b);
    
    const expiringToday = filtered.filter(c => getDaysUntilExpiry(c) === 0 && c.status.trim().toLowerCase() === 'due').sort(sortByExpiry);
    const expiring1Day = filtered.filter(c => getDaysUntilExpiry(c) === 1 && c.status.trim().toLowerCase() === 'due').sort(sortByExpiry);
    const expiring3 = filtered.filter(c => {
      const days = getDaysUntilExpiry(c);
      return days >= 2 && days <= 3 && c.status.trim().toLowerCase() === 'due';
    }).sort(sortByExpiry);
    const expiring7 = filtered.filter(c => {
      const days = getDaysUntilExpiry(c);
      return days >= 4 && days <= 7 && c.status.trim().toLowerCase() === 'due';
    }).sort(sortByExpiry);
    const expiring15 = filtered.filter(c => {
      const days = getDaysUntilExpiry(c);
      return days > 7 && days <= 15 && c.status.trim().toLowerCase() === 'due';
    }).sort(sortByExpiry);
    const expiring30 = filtered.filter(c => {
      const days = getDaysUntilExpiry(c);
      return days > 15 && days <= 30 && c.status.trim().toLowerCase() === 'due';
    }).sort(sortByExpiry);
    const overdue = filtered.filter(c => getDaysUntilExpiry(c) < 0 && c.status.trim().toLowerCase() === 'due').sort(sortByExpiry);
    const renewed = filtered.filter(c => c.status.trim().toLowerCase() === 'renewed').sort(sortByExpiry);
    const inProcess = filtered.filter(c => {
      const status = c.status.trim().toLowerCase().replace(/[\s-]/g, '');
      return status === 'inprocess' || status === 'inprogress';
    }).sort(sortByExpiry);
    
    return { expiringToday, expiring1Day, expiring3, expiring7, expiring15, expiring30, overdue, renewed, inProcess };
  };

  const handleBulkStatusUpdate = async (newStatus: string, customerIds?: number[]) => {
    const ids = customerIds || selectedCustomers;
    if (ids.length === 0) {
      alert('Please select customers');
      return;
    }
    
    const selectedCustomerData = customers.filter(c => ids.includes(c.id));
    
    try {
      for (const customerId of ids) {
        await api.put(`/api/insurance/customers/${customerId}`, {
          ...customers.find(c => c.id === customerId),
          status: newStatus
        });
      }
      
      // await api.post('/api/insurance/sync/to-sheet', {
      //   tabName: SHEET_TAB_NAME
      // });
      
      if (newStatus === 'renewed' && confirm('Send Thank You messages via WhatsApp to renewed customers?')) {
        selectedCustomerData.forEach(customer => {
          const message = generateThankYouMessage({ 
            customerName: customer.name, 
            renewalDate: getDisplayDate(customer),
            policyNumber: customer.current_policy_no,
            companyName: customer.company,
            premiumAmount: customer.premium?.toString(),
            clientKey,
            vehicleNumber: customer.registration_no,
            productModel: customer.product
          });
          window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
        });
      }
      
      // Auto-sync to sheet
      try {
        const syncResult = await api.post('/api/insurance/sync/to-sheet', { tabName: SHEET_TAB_NAME });
        if (syncResult.data.message !== 'No changes to sync') {
          console.log('Auto-synced bulk status update to sheet');
        }
      } catch (syncError) {
        console.error('Auto-sync failed:', syncError);
      }
      
      setSelectedCustomers([]);
      await reloadDataAfterUpdate();
      
      // Auto-sync to sheet
      try {
        const syncResult = await api.post('/api/insurance/sync/to-sheet', { tabName: SHEET_TAB_NAME });
        if (syncResult.data.message !== 'No changes to sync') {
          console.log('Auto-synced bulk status update to sheet');
        }
      } catch (syncError) {
        console.error('Auto-sync failed:', syncError);
      }
      
      alert(`${ids.length} customer${ids.length > 1 ? 's' : ''} marked as ${newStatus}`);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update customer status');
    }
  };

  const handleAddNote = async () => {
    if (!noteCustomerId || !note) return;
    
    try {
      await api.post(`/api/insurance/customers/${noteCustomerId}/notes`, { note });
      
      // Auto-sync to sheet
      try {
        const syncResult = await api.post('/api/insurance/sync/to-sheet', { tabName: SHEET_TAB_NAME });
        if (syncResult.data.message !== 'No changes to sync') {
          console.log('Auto-synced note update to sheet');
        }
      } catch (syncError) {
        console.error('Auto-sync failed:', syncError);
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

  const sortCustomersByExpiry = (custs: Customer[]) => {
    return [...custs].sort((a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b));
  };

  const renderRenewalCard = (customer: Customer, daysLabel: string, colorClass: string, isRenewed: boolean = false, compact: boolean = false) => {
    const isMotor = customer.vertical === 'motor' || customer.vertical === '2-wheeler';
    const isSelected = selectedCustomers.includes(customer.id);
    const displayDate = getDisplayDate(customer);
    const nextRenewalDate = isRenewed ? calculateNextRenewalDate(displayDate, customer.premium_mode) : displayDate;
    const actualIsRenewed = customer.status?.trim().toLowerCase() === 'renewed';
    
    if (compact) {
      return (
        <div key={customer.id} className={`p-3 bg-slate-700/50 rounded-lg border ${colorClass} cursor-pointer hover:bg-slate-700/70 transition-all`} onClick={() => { setDetailsModalTitle(`${customer.name} - Details`); setDetailsModalCustomers([customer]); setShowDetailsModal(true); }}>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => { e.stopPropagation(); toggleCustomerSelection(customer.id); }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 flex-shrink-0 mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-2">
                <h4 className="font-medium text-white text-sm">{customer.name}</h4>
                {customer.g_code && <span className="text-cyan-400 font-semibold">G: {customer.g_code}</span>}
                {customer.vertical && <span className="text-slate-300">• {customer.vertical.toUpperCase()}</span>}
                {customer.product_type && <span className="text-slate-300">• {customer.product_type.toUpperCase()}</span>}
                {customer.product_model && <span className="text-slate-300">• {customer.product_model.toUpperCase()}</span>}
                {actualIsRenewed ? (
                  <>
                    {customer.new_company && <span className="text-green-400 font-medium">• {customer.new_company}</span>}
                    {customer.new_policy_no && <span className="text-green-400 font-medium">• Pol: {customer.new_policy_no}</span>}
                    <span className="text-green-400 font-medium">• Next: {calculateNextRenewalDate(displayDate, customer.premium_mode)}</span>
                  </>
                ) : (
                  <>
                    {customer.company && <span className="text-slate-300">• {customer.company}</span>}
                    {customer.current_policy_no && <span className="text-cyan-400">• Pol: {customer.current_policy_no}</span>}
                    <span className="text-orange-400 font-medium">• {displayDate}</span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white whitespace-nowrap">₹{parseAmount(customer.premium).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isSelected ? (
                <button
                  className="px-3 py-1 text-xs border border-green-500/50 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowRenewalUpdateModal(true);
                  }}
                  title="Update & Sync"
                >
                  ✏️ Update & Sync
                </button>
              ) : (
                <>
                  <button
                    className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-700 transition-all"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      let message = '';
                      const days = getDaysUntilExpiry(customer);
                      if (actualIsRenewed) {
                        message = generateThankYouMessage({ 
                          customerName: customer.name, 
                          renewalDate: displayDate,
                          policyNumber: customer.current_policy_no,
                          companyName: customer.company,
                          premiumAmount: customer.premium?.toString(),
                          clientKey,
                          vehicleNumber: customer.registration_no,
                          productModel: customer.product
                        });
                      } else {
                        message = generateRenewalReminder({ 
                          customerName: customer.name, 
                          renewalDate: displayDate, 
                          daysRemaining: days,
                          policyNumber: customer.current_policy_no,
                          companyName: customer.company,
                          premiumAmount: customer.premium?.toString(),
                          clientKey,
                          vehicleNumber: customer.registration_no,
                          productModel: customer.product
                        });
                      }
                      logWhatsAppMessage(customer.id, customer.name, message);
                      window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
                    }}
                    title="Send WhatsApp"
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
                    title="Add Note"
                  >
                    📝
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div key={customer.id} className={`p-3 bg-slate-700/50 rounded-lg border ${colorClass} cursor-pointer hover:bg-slate-700/70 transition-all`} onClick={() => { setDetailsModalTitle(`${customer.name} - Details`); setDetailsModalCustomers([customer]); setShowDetailsModal(true); }}>
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); toggleCustomerSelection(customer.id); }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 flex-shrink-0 mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mb-3">
              <h4 className="font-medium text-white text-sm">{customer.name}</h4>
              {isMotor && customer.registration_no && (
                <span className="text-slate-300">• {customer.registration_no}</span>
              )}
              <span className="text-slate-300">• {customer.company}</span>
              {customer.g_code && (
                <span className="text-cyan-400 font-medium">• G: {customer.g_code}</span>
              )}
              <span className="text-cyan-400 font-medium">• Pol: {customer.current_policy_no || '-'}</span>
              <span className="text-orange-400 font-medium">• {getDisplayDate(customer)}</span>
              <span className="font-bold text-white text-base">• ₹{parseAmount(customer.premium).toLocaleString()}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {isSelected && (
                <select 
                  className="px-3 py-1 text-xs border border-cyan-500/50 rounded bg-slate-800 text-white font-medium hover:bg-slate-700 cursor-pointer"
                  onChange={(e) => { e.stopPropagation(); if (e.target.value) { handleBulkStatusUpdate(e.target.value); e.target.value = ''; } }}
                  onClick={(e) => e.stopPropagation()}
                  defaultValue=""
                >
                  <option value="" disabled>Mark as...</option>
                  <option value="due">🔴 DUE</option>
                  <option value="renewed">🟢 RENEWED</option>
                  <option value="inprocess">🔵 IN PROCESS</option>
                  <option value="not renewed">⚫ NOT RENEWED</option>
                </select>
              )}
              {!isSelected && (
                <>
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
                      clientKey,
                      vehicleNumber: customer.registration_no,
                      productModel: customer.product
                    });
                  } else {
                    message = generateRenewalReminder({ 
                      customerName: customer.name, 
                      renewalDate: displayDate, 
                      daysRemaining: days,
                      policyNumber: customer.current_policy_no,
                      companyName: customer.company,
                      premiumAmount: customer.premium?.toString(),
                      clientKey,
                      vehicleNumber: customer.registration_no,
                      productModel: customer.product
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const loadClientConfig = async () => {
    try {
      const vertical = verticalFilter === 'life' ? 'life' : 'general';
      const res = await api.get(`/api/insurance-config/config?vertical=${vertical}`);
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
    const nameField = sheetFields.find(f => f.toLowerCase().replace(/\s+/g, '_') === 'name');
    const mobileField = sheetFields.find(f => f.toLowerCase().replace(/\s+/g, '_').includes('mobile'));
    const policyField = sheetFields.find(f => f.toLowerCase().replace(/\s+/g, '_').includes('policy'));
    
    const nameKey = nameField?.toLowerCase().replace(/\s+/g, '_');
    const mobileKey = mobileField?.toLowerCase().replace(/\s+/g, '_');
    const policyKey = policyField?.toLowerCase().replace(/\s+/g, '_');
    
    if (!dynamicFormData[nameKey] || !dynamicFormData[mobileKey]) {
      alert('Name and Mobile Number are required!');
      return;
    }
    
    // Check for duplicates with similarity matching
    const checkRes = await api.post('/api/insurance/customers/check-duplicate', {
      name: dynamicFormData[nameKey],
      mobile_number: dynamicFormData[mobileKey],
      current_policy_no: dynamicFormData[policyKey] || '',
      customer_id: dynamicFormData['customer_id'] || '',
      vertical: dynamicFormData['vertical'] || dynamicFormData['type'] || '',
      product_type: dynamicFormData['product_type'] || ''
    });
    
    if (checkRes.data.isDuplicate) {
      const { existing, similarityPercent, matchedFields, matchCount, totalFields } = checkRes.data;
      
      const fieldLabels = {
        name: 'Name',
        mobile_number: 'Mobile Number',
        current_policy_no: 'Policy Number',
        customer_id: 'Customer ID',
        vertical: 'TYPE',
        product_type: 'Product Type'
      };
      
      const matchedFieldNames = matchedFields.map(f => fieldLabels[f] || f).join(', ');
      
      if (!confirm(`⚠️ Potential Duplicate Found!\n\nSimilarity: ${similarityPercent}% (${matchCount}/${totalFields} fields match)\n\nExisting Customer:\nName: ${existing.name}\nMobile: ${existing.mobile_number}\nPolicy: ${existing.current_policy_no || 'N/A'}\n\nMatching Fields:\n${matchedFieldNames}\n\nClick OK to add as NEW customer anyway, or Cancel to go back.`)) {
        return;
      }
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
      
      const payload: any = {};
      sheetFields.forEach(field => {
        const key = field.toLowerCase().replace(/\s+/g, '_');
        if (dynamicFormData[key] !== undefined) {
          const backendKey = mapFieldNameToBackend(key);
          
          if (key.includes('date') || key.includes('expiry')) {
            payload[backendKey] = convertDate(dynamicFormData[key]);
          } else if (key === 'premium' || key === 'amount') {
            payload[backendKey] = parseFloat(dynamicFormData[key]) || 0;
          } else {
            payload[backendKey] = dynamicFormData[key];
          }
        }
      });
      
      // Ensure backend required fields are present
      if (!payload.name) payload.name = dynamicFormData[nameKey];
      if (!payload.mobile_number) payload.mobile_number = dynamicFormData[mobileKey];
      
      await api.post('/api/insurance/customers', payload);
      
      // Auto-sync to sheet
      const syncResult = await api.post('/api/insurance/sync/to-sheet', { tabName: SHEET_TAB_NAME });
      console.log('Sync result:', syncResult.data);
      
      if (syncResult.data.message === 'No changes to sync') {
        alert('✅ Customer added to database successfully!\n\nNote: Sheet already up to date.');
      } else {
        alert(`✅ Customer added and synced to sheet!\n\nUpdated: ${syncResult.data.updated || 0} rows\nAdded: ${syncResult.data.added || 0} rows`);
      }
      
      setShowAddModal(false);
      setDynamicFormData({});
      loadData();
    } catch (error) {
      console.error('Failed to add customer:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert('Failed to add customer: ' + errorMsg);
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
      
      // Apply field name mapping to editingCustomer
      const payload: any = {};
      Object.keys(editingCustomer).forEach(key => {
        const backendKey = mapFieldNameToBackend(key);
        const value = editingCustomer[key];
        
        if (key.includes('date') || key.includes('expiry')) {
          payload[backendKey] = convertDate(value);
        } else if (key === 'amount') {
          payload['premium'] = value;
        } else {
          payload[backendKey] = value;
        }
      });
      
      await api.put(`/api/insurance/customers/${editingCustomer.id}`, payload);
      
      // Auto-sync to sheet
      try {
        const syncResult = await api.post('/api/insurance/sync/to-sheet', { tabName: SHEET_TAB_NAME });
        if (syncResult.data.message !== 'No changes to sync') {
          console.log('Auto-synced updated customer to sheet');
        }
      } catch (syncError) {
        console.error('Auto-sync failed:', syncError);
      }
      
      setEditingCustomer(null);
      await reloadDataAfterUpdate();
    } catch (error) {
      console.error('Failed to update customer:', error);
      alert('Failed to update customer: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      // Get customer data before deletion
      const customerToDelete = customers.find(c => c.id === id);
      
      const response = await api.delete(`/api/insurance/customers/${id}`);
      
      // Track deleted customer
      if (customerToDelete && response.data.deletedCustomer) {
        setDeletedCustomers(prev => [...prev, response.data.deletedCustomer]);
      }
      
      loadData();
      
      // Auto-sync to sheet with deleted customer info
      if (customerToDelete) {
        try {
          const syncResult = await api.post('/api/insurance/sync/to-sheet', { 
            tabName: SHEET_TAB_NAME,
            deletedCustomers: [response.data.deletedCustomer || customerToDelete]
          });
          
          if (syncResult.data.deleted > 0) {
            alert(`✅ Customer deleted from database and sheet!\n\nDeleted: ${syncResult.data.deleted} row(s)`);
          } else {
            alert('✅ Customer deleted from database!\n\nNote: No matching row found in sheet.');
          }
          
          // Clear deleted customers after successful sync
          setDeletedCustomers([]);
        } catch (syncError) {
          console.error('Auto-sync failed:', syncError);
          alert('✅ Customer deleted from database!\n\n⚠️ Failed to sync deletion to sheet. Please sync manually.');
        }
      }
    } catch (error) {
      console.error('Failed to delete customer:', error);
      alert('❌ Failed to delete customer: ' + (error.response?.data?.error || error.message));
    }
  };

  const syncFromSheets = async (silent = false) => {
    if (syncing) return;
    try {
      setSyncing(true);
      await api.post('/api/insurance/sync/from-sheet', {
        tabName: SHEET_TAB_NAME
      });
      
      if (!silent) {
        alert('✅ Sync queued! Processing in background...');
      }
      
      // Poll for completion in background
      setTimeout(async () => {
        let completed = false;
        let attempts = 0;
        while (!completed && attempts < 120) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            const statusRes = await api.get('/api/insurance/sync/status');
            if (statusRes.data.status === 'idle') {
              completed = true;
              await loadData();
              console.log('✅ Sync completed, data refreshed');
            }
          } catch (e) {
            console.error('Status check failed:', e);
          }
          attempts++;
        }
      }, 0);
      
      setSyncing(false);
    } catch (error) {
      console.error('Failed to sync from sheets:', error);
      if (!silent) {
        alert(`❌ Sync from sheet failed: ${error.response?.data?.error || error.message}`);
      }
      setSyncing(false);
    }
  };

  const filteredCustomers = applyGlobalFilter(customers).filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    
    // Search through ALL customer fields dynamically
    return Object.values(customer).some(value => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(searchLower);
    });
  }).filter(customer => {
    const matchesStatus = statusFilter === 'all' || customer.status.trim().toLowerCase() === statusFilter.toLowerCase();
    return matchesStatus;
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
    const { expiringToday, expiring1Day, expiring3, expiring7 } = categorizeCustomers();
    const todayTasks = [...expiringToday, ...expiring1Day, ...expiring3, ...expiring7];
    const expired = applyGlobalFilter(customers).filter(c => getDaysUntilExpiry(c) < 0 && c.status.trim().toLowerCase() === 'due');
    
    return (
      <div className="space-y-4">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
          <h3 className="text-base font-semibold mb-3 text-white flex items-center gap-2">
            ⚡ Quick Actions - Today's Priority ({todayTasks.length})
          </h3>
          
          {todayTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-lg">✅ All caught up! No urgent tasks today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, quickActionsLimit).map(customer => {
                const daysLeft = getDaysUntilExpiry(customer);
                const isOverdue = daysLeft < 0;
                const colorClass = isOverdue ? 'border-red-500/30' : 'border-orange-500/30';
                const displayDate = getDisplayDate(customer);
                
                return (
                  <div key={customer.id} className={`p-3 bg-slate-700/50 rounded-lg border ${colorClass} cursor-pointer hover:bg-slate-700/70 transition-all`} onClick={() => { setDetailsModalTitle(`${customer.name} - Details`); setDetailsModalCustomers([customer]); setShowDetailsModal(true); }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <h4 className="font-medium text-white text-sm">{customer.name}</h4>
                          {customer.g_code && <span className="text-cyan-400 font-semibold">G: {customer.g_code}</span>}
                          <>
                            {customer.company && <span className="text-slate-300">• {customer.company}</span>}
                            {customer.current_policy_no && <span className="text-cyan-400">• Pol: {customer.current_policy_no}</span>}
                            <span className="text-orange-400 font-medium">• {displayDate}</span>
                          </>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-white whitespace-nowrap">₹{parseAmount(customer.premium).toLocaleString()}</span>
                        <button
                          className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-700 transition-all"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            let message = '';
                            const days = getDaysUntilExpiry(customer);
                            message = generateRenewalReminder({ 
                              customerName: customer.name, 
                              renewalDate: displayDate, 
                              daysRemaining: days,
                              policyNumber: customer.current_policy_no,
                              companyName: customer.company,
                              premiumAmount: customer.premium?.toString(),
                              clientKey,
                              vehicleNumber: customer.registration_no,
                              productModel: customer.product
                            });
                            logWhatsAppMessage(customer.id, customer.name, message);
                            window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
                          }}
                          title="Send WhatsApp"
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
                          title="Add Note"
                        >
                          📝
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {todayTasks.length > quickActionsLimit && (
                <div className="text-center pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setQuickActionsLimit(prev => prev + 10)}
                  >
                    Show More ({todayTasks.length - quickActionsLimit} remaining)
                  </Button>
                </div>
              )}
              
              {quickActionsLimit > 5 && (
                <div className="text-center pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setQuickActionsLimit(5)}
                  >
                    Show Less
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
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 cursor-pointer hover:bg-red-500/20 transition-all" onClick={() => { setDetailsModalTitle('Expiring Today'); setDetailsModalCustomers(expiringToday); setShowDetailsModal(true); }}>
            <h4 className="text-xs text-red-300 mb-1">Expiring Today</h4>
            <p className="text-2xl font-bold text-red-400">{expiringToday.length}</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2 w-full text-xs"
              onClick={(e) => { e.stopPropagation(); setDetailsModalTitle('Expiring Today'); setDetailsModalCustomers(expiringToday); setShowDetailsModal(true); }}
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
      await api.post('/api/insurance/sync/to-sheet', {
        tabName: SHEET_TAB_NAME,
        deletedCustomers: deletedCustomers
      });
      
      alert('✅ Sync queued! Processing in background...');
      
      // Poll for completion in background
      setTimeout(async () => {
        let completed = false;
        let attempts = 0;
        while (!completed && attempts < 120) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            const statusRes = await api.get('/api/insurance/sync/status');
            if (statusRes.data.status === 'idle') {
              completed = true;
              setDeletedCustomers([]);
              console.log('✅ Sync completed');
            }
          } catch (e) {
            console.error('Status check failed:', e);
          }
          attempts++;
        }
      }, 0);
      
      setSyncing(false);
    } catch (error) {
      console.error('Failed to sync to sheets:', error);
      alert(`❌ Sync to sheet failed: ${error.response?.data?.error || error.message}`);
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
                onChange={(e) => handleSearchChange('customerSearch', e.target.value)}
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
              <Button 
                onClick={() => {
                  if (clientConfig?.spreadsheetId) {
                    window.open(`https://docs.google.com/spreadsheets/d/${clientConfig.spreadsheetId}`, '_blank', 'noopener,noreferrer');
                  } else {
                    alert('Sheet URL not available');
                  }
                }}
                variant="outline"
                title="Open Google Sheet"
                size="sm"
              >
                📊 Open Sheet
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
          isAdmin={isAdmin}
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
    const filteredPoliciesData = applyGlobalFilter(customers);
    const filteredPolicies = policyTab === 'active' 
      ? filteredPoliciesData.filter(c => c.status.trim().toLowerCase() === 'renewed')
      : policyTab === 'lost'
      ? filteredPoliciesData.filter(c => c.status.trim().toLowerCase() === 'not renewed')
      : policyTab === 'pending'
      ? filteredPoliciesData.filter(c => {
          const daysLeft = getDaysUntilExpiry(c);
          return (daysLeft < 0 || daysLeft <= 30) && c.status.trim().toLowerCase() === 'due';
        })
      : filteredPoliciesData;

    return (
    <div className="space-y-6">
      {/* Policy Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-400 cursor-pointer hover:text-cyan-300 border border-slate-700 rounded"
          onClick={() => { setDetailsModalTitle('Total Policies'); setDetailsModalCustomers(applyGlobalFilter(customers)); setShowDetailsModal(true); }}
        >
          Total ({applyGlobalFilter(customers).length})
        </button>
        <button
          className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-400 cursor-pointer hover:text-green-300 border border-slate-700 rounded"
          onClick={() => { const activePolicies = applyGlobalFilter(customers).filter(c => c.status.trim().toLowerCase() === 'renewed'); setDetailsModalTitle('Active Policies'); setDetailsModalCustomers(activePolicies); setShowDetailsModal(true); }}
        >
          Active ({applyGlobalFilter(customers).filter(c => c.status.trim().toLowerCase() === 'renewed').length})
        </button>
        <button
          className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-400 cursor-pointer hover:text-blue-300 border border-slate-700 rounded"
          onClick={() => { const inprocessPolicies = applyGlobalFilter(customers).filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); return status === 'inprocess' || status === 'inprogress'; }); setDetailsModalTitle('In Process'); setDetailsModalCustomers(inprocessPolicies); setShowDetailsModal(true); }}
        >
          In Process ({applyGlobalFilter(customers).filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); return status === 'inprocess' || status === 'inprogress'; }).length})
        </button>
        <button
          className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-400 cursor-pointer hover:text-red-300 border border-slate-700 rounded"
          onClick={() => { const pendingPolicies = applyGlobalFilter(customers).filter(c => { const daysLeft = getDaysUntilExpiry(c); return (daysLeft < 0 || daysLeft <= 30) && c.status.trim().toLowerCase() === 'due'; }); setDetailsModalTitle('Pending Policies'); setDetailsModalCustomers(pendingPolicies); setShowDetailsModal(true); }}
        >
          Pending ({applyGlobalFilter(customers).filter(c => { const daysLeft = getDaysUntilExpiry(c); return (daysLeft < 0 || daysLeft <= 30) && c.status.trim().toLowerCase() === 'due'; }).length})
        </button>
        <button
          className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-400 cursor-pointer hover:text-orange-300 border border-slate-700 rounded"
          onClick={() => { const lostPolicies = applyGlobalFilter(customers).filter(c => c.status.trim().toLowerCase() === 'not renewed'); setDetailsModalTitle('Lost Policies'); setDetailsModalCustomers(lostPolicies); setShowDetailsModal(true); }}
        >
          Lost ({applyGlobalFilter(customers).filter(c => c.status.trim().toLowerCase() === 'not renewed').length})
        </button>
      </div>

      {/* Company-wise Breakdown */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4">
        <h3 className="text-base font-semibold mb-3 text-white">Company-wise Policies</h3>
        
        {/* Total Amount Card */}
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-purple-500/20 transition-all" onClick={() => { setDetailsModalTitle('All Policies - Total Premium'); setDetailsModalCustomers(applyGlobalFilter(customers)); setShowDetailsModal(true); }}>
          <h4 className="text-sm font-medium text-purple-300 mb-1">Total Premium (All Companies)</h4>
          <p className="text-3xl font-bold text-purple-400">₹{applyGlobalFilter(customers).reduce((sum, c) => sum + parseAmount(c.premium), 0).toLocaleString()}</p>
          <p className="text-xs text-slate-300 mt-1">{applyGlobalFilter(customers).length} total policies</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(
            applyGlobalFilter(customers).reduce((acc, customer) => {
              const company = customer.company || 'Unknown';
              if (!acc[company]) acc[company] = { count: 0, premium: 0, renewed: 0, inprocess: 0, due: 0, lost: 0, customers: [] };
              acc[company].count++;
              acc[company].premium += parseAmount(customer.premium);
              if (customer.status.trim().toLowerCase() === 'renewed') acc[company].renewed++;
              const statusLower = customer.status.trim().toLowerCase().replace(/[\s-]/g, '');
              if (statusLower === 'inprocess' || statusLower === 'inprogress') acc[company].inprocess++;
              if (customer.status.trim().toLowerCase() === 'due') acc[company].due++;
              if (customer.status.trim().toLowerCase() === 'not renewed') acc[company].lost++;
              acc[company].customers.push(customer);
              return acc;
            }, {})
          ).map(([company, data]: [string, any]) => (
            <div key={company} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const sorted = [...data.customers].sort((a, b) => { const aIsDue = a.status.trim().toLowerCase() === 'due' ? 0 : 1; const bIsDue = b.status.trim().toLowerCase() === 'due' ? 0 : 1; return aIsDue - bIsDue; }); setDetailsModalTitle(`${company} - Customers`); setDetailsModalCustomers(sorted); setShowDetailsModal(true); }}>
              <h4 className="text-sm font-medium text-white mb-1">{company}</h4>
              <p className="text-xs text-slate-300">Total: {data.count} | <span className="text-green-400">Renewed: {data.renewed}</span> | <span className="text-blue-400">In Process: {data.inprocess}</span> | <span className="text-red-400">Due: {data.due}</span> | <span className="text-gray-400">Lost: {data.lost}</span></p>
              <p className="text-base font-bold text-cyan-400">₹{data.premium.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  };



  const renderRenewalsTab = () => {
    const { expiringToday, expiring1Day, expiring3, expiring7, expiring15, expiring30, overdue, renewed, inProcess } = categorizeCustomers();
    
    return (
      <div className="space-y-6">
        {/* Filter and Stats Section */}
        <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md z-10 pb-4 pt-2 border border-slate-700/50 rounded-xl mb-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search by name, mobile, vehicle, company, policy no, G code..."
              value={renewalSearchTerm}
              onChange={(e) => handleSearchChange('renewalSearch', e.target.value)}
              className="w-full flex-1"
            />
            <input
              type="month"
              value={renewalMonthFilter}
              onChange={(e) => setRenewalMonthFilter(e.target.value)}
              className="px-3 py-2 border rounded bg-slate-700 text-white text-sm"
            />
          </div>

          {/* Statistics - Fixed */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg cursor-pointer hover:bg-red-500/20 transition-all" onClick={() => document.getElementById('today-section')?.scrollIntoView({ behavior: 'smooth' })}>
              <h4 className="text-xs text-red-300 mb-1">Expiring Today</h4>
              <p className="text-2xl font-bold text-red-400">{expiringToday.length}</p>
            </div>
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg cursor-pointer hover:bg-orange-500/20 transition-all" onClick={() => document.getElementById('expiring3-section')?.scrollIntoView({ behavior: 'smooth' })}>
              <h4 className="text-xs text-orange-300 mb-1">Within 3 Days</h4>
              <p className="text-2xl font-bold text-orange-400">{expiring1Day.length + expiring3.length}</p>
            </div>
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg cursor-pointer hover:bg-yellow-500/20 transition-all" onClick={() => document.getElementById('expiring7-section')?.scrollIntoView({ behavior: 'smooth' })}>
              <h4 className="text-xs text-yellow-300 mb-1">Within 7 Days</h4>
              <p className="text-2xl font-bold text-yellow-400">{expiring7.length}</p>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg cursor-pointer hover:bg-blue-500/20 transition-all" onClick={() => document.getElementById('inprocess-section')?.scrollIntoView({ behavior: 'smooth' })}>
              <h4 className="text-xs text-blue-300 mb-1">In Process</h4>
              <p className="text-2xl font-bold text-blue-400">{inProcess.length}</p>
            </div>
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg cursor-pointer hover:bg-green-500/20 transition-all" onClick={() => document.getElementById('renewed-section')?.scrollIntoView({ behavior: 'smooth' })}>
              <h4 className="text-xs text-green-300 mb-1">Renewed</h4>
              <p className="text-2xl font-bold text-green-400">{renewed.length}</p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-4">

        {/* Renewal Update Modal - Shows when customers are selected */}
        {selectedCustomers.length > 0 && (
          <div className="sticky top-0 z-20 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 backdrop-blur-md shadow-lg">
            <p className="text-white font-semibold text-base">
              <span className="bg-cyan-500/30 px-2 py-1 rounded">{selectedCustomers.length}</span> customer{selectedCustomers.length > 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2 items-center flex-wrap">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowRenewalUpdateModal(true)}
                className="border-green-500/50 text-green-400 hover:bg-green-500/10"
              >
                ✏️ Update & Sync
              </Button>
              <span className="text-sm text-slate-200 font-medium">Mark as:</span>
              <select 
                className="px-4 py-2 border-2 border-cyan-500/50 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
                onChange={(e) => { if (e.target.value) handleBulkStatusUpdate(e.target.value); e.target.value = ''; }}
                defaultValue=""
              >
                <option value="" disabled>Select Status</option>
                <option value="due">🔴 DUE</option>
                <option value="renewed">🟢 RENEWED</option>
                <option value="inprocess">🔵 IN PROCESS</option>
                <option value="not renewed">⚫ NOT RENEWED</option>
              </select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedCustomers([])}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                ✕ Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Show message if no renewals at all */}
        {expiringToday.length === 0 && expiring1Day.length === 0 && expiring3.length === 0 && expiring7.length === 0 && expiring15.length === 0 && expiring30.length === 0 && overdue.length === 0 && renewed.length === 0 && inProcess.length === 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-12 text-center">
            <p className="text-2xl text-slate-400">✅ No renewals to display</p>
            <p className="text-sm text-slate-500 mt-2">All customers are up to date!</p>
          </div>
        )}

        {/* Expiring Today */}
        {expiringToday.length > 0 && (
          <div id="today-section" className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-red-400">🚨 Expiring Today ({expiringToday.length})</h3>
            <div className="space-y-3">
              {expiringToday.slice(0, showAllToday ? expiringToday.length : 5).map(c => renderRenewalCard(c, `Expires TODAY`, 'border-red-500/50', false, true))}
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

        {/* Expiring Tomorrow */}
        {expiring1Day.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-orange-400">⚠️ Expiring Tomorrow ({expiring1Day.length})</h3>
            <div className="space-y-3">
              {expiring1Day.slice(0, showAllTomorrow ? expiring1Day.length : 5).map(c => renderRenewalCard(c, 'Expires TOMORROW', 'border-orange-500/50', false, true))}
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

        {/* Expiring Within 3 Days */}
        {expiring3.length > 0 && (
          <div id="expiring3-section" className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-orange-400">🟠 Expiring Within 3 Days ({expiring3.length})</h3>
            <div className="space-y-3">
              {expiring3.slice(0, showAll7Days ? expiring3.length : 5).map(c => renderRenewalCard(c, `${getDaysUntilExpiry(c)} days left`, 'border-orange-500/50', false, true))}
            </div>
            {expiring3.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setShowAll7Days(!showAll7Days)}>
                  {showAll7Days ? 'Show Less' : `Show All (${expiring3.length - 5} more)`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Expiring Within 7 Days */}
        {expiring7.length > 0 && (
          <div id="expiring7-section" className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-yellow-400">🟡 Expiring Within 7 Days ({expiring7.length})</h3>
            <div className="space-y-3">
              {expiring7.slice(0, showAll7Days ? expiring7.length : 5).map(c => renderRenewalCard(c, `${getDaysUntilExpiry(c)} days left`, 'border-yellow-500/50', false, true))}
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
              {expiring15.slice(0, showAll15Days ? expiring15.length : 5).map(c => renderRenewalCard(c, `${getDaysUntilExpiry(c)} days left`, 'border-yellow-500/50', false, true))}
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
              {expiring30.slice(0, showAll30Days ? expiring30.length : 5).map(c => renderRenewalCard(c, `${getDaysUntilExpiry(c)} days left`, 'border-yellow-500/50', false, true))}
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

        {/* Overdue */}
        {overdue.length > 0 && (
          <div id="overdue-section" className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-red-500">🔴 Overdue ({overdue.length})</h3>
            <div className="space-y-3">
              {overdue.slice(0, showAllOverdue ? overdue.length : 5).map(c => renderRenewalCard(c, `${Math.abs(getDaysUntilExpiry(c))} days overdue`, 'border-red-600/50', false, true))}
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

        {/* In Process */}
        {inProcess.length > 0 && (
          <div id="inprocess-section" className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 scroll-mt-48">
            <h3 className="text-base font-semibold mb-3 text-blue-400">🔵 In Process ({inProcess.length})</h3>
            <div className="space-y-3">
              {inProcess.slice(0, showAllInProcess ? inProcess.length : 5).map(c => renderRenewalCard(c, 'In Process', 'border-blue-500/50', false, true))}
            </div>
            {inProcess.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setShowAllInProcess(!showAllInProcess)}>
                  {showAllInProcess ? 'Show Less' : `Show All (${inProcess.length - 5} more)`}
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
              {renewed.slice(0, showAllRenewed ? renewed.length : 5).map(c => renderRenewalCard(c, 'Renewed', 'border-green-500/50', true, true))}
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





  const getUniqueCustomers = () => {
    const uniqueMap = new Map<string, Customer[]>();
    customers.forEach(c => {
      const key = `${c.name?.toLowerCase().trim()}|${c.g_code?.toLowerCase().trim() || ''}|${c.mobile_number?.trim() || ''}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, []);
      }
      uniqueMap.get(key)!.push(c);
    });
    return Array.from(uniqueMap.values());
  };

  const getUniqueCustomerCount = () => {
    return getUniqueCustomers().length;
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
    <div className="flex justify-between items-center mb-4 relative z-30">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
            {getPageTitle()}
          </h1>
          {currentTab === 'customers' && (
            <button
              onClick={() => {
                if (customers.length === 0) {
                  alert('⏳ Please wait for customers to load first, or sync from sheets.');
                  return;
                }
                setShowUniqueCustomersModal(true);
              }}
              className="px-3 py-1 text-sm font-medium bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-all disabled:opacity-50"
              disabled={customers.length === 0}
            >
              👥 Unique CX ({getUniqueCustomerCount()})
            </button>
          )}
        </div>
        {verticalFilter !== 'all' && (
          <p className="text-sm text-slate-400 mt-1">📊 Filter: <span className="text-cyan-400 font-medium">{verticalFilter === 'health-base' ? 'Health Base' : verticalFilter === 'health-topup' ? 'Health Topup' : verticalFilter === '4-wheeler' ? '4-Wheeler' : verticalFilter === '2-wheeler' ? '2-Wheeler' : verticalFilter === 'health' ? 'All Health' : verticalFilter === 'non-motor' ? 'Non-Motor' : verticalFilter === 'motor' ? 'All Motor' : verticalFilter === 'life' ? 'Life' : 'General'}</span></p>
        )}
      </div>

      {currentTab === 'customers' && (
        <Button
          onClick={() => {
            setDynamicFormData({});
            setShowAddModal(true);
          }}
        >
          Add Customer
        </Button>
      )}
    </div>



    {/* Content */}
    <div>
      {/* Sticky Stats - Visible across all sections */}
      {analytics && (
        <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-md border-b border-slate-700/50 shadow-lg mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-1 p-2 w-full">
            <button className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all text-left" onClick={() => { const statusOrder = { 'due': 0, 'inprocess': 1, 'inprogress': 1, 'renewed': 2, 'not renewed': 3 }; const sorted = [...applyGlobalFilter(customers)].sort((a, b) => { const aStatus = a.status.trim().toLowerCase().replace(/[\s-]/g, ''); const bStatus = b.status.trim().toLowerCase().replace(/[\s-]/g, ''); const aOrder = statusOrder[aStatus] ?? 4; const bOrder = statusOrder[bStatus] ?? 4; if (aOrder !== bOrder) return aOrder - bOrder; return getDaysUntilExpiry(a) - getDaysUntilExpiry(b); }); setDetailsModalTitle('Total Policies'); setDetailsModalCustomers(sorted); setShowDetailsModal(true); }}>
              <h3 className="text-xs text-slate-400 mb-1">Total</h3>
              <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">{applyGlobalFilter(customers).length}</p>
            </button>
            <button className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all text-left" onClick={() => { const upcoming = applyGlobalFilter(customers).filter(c => { const days = getDaysUntilExpiry(c); return days >= 0 && days <= 30 && c.status.trim().toLowerCase() === 'due'; }).sort((a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b)); setDetailsModalTitle('Upcoming Renewals'); setDetailsModalCustomers(upcoming); setShowDetailsModal(true); }}>
              <h3 className="text-xs text-slate-400 mb-1">Upcoming</h3>
              <p className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">{applyGlobalFilter(customers).filter(c => { const days = getDaysUntilExpiry(c); return days >= 0 && days <= 30 && c.status.trim().toLowerCase() === 'due'; }).length}</p>
            </button>
            <button className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all text-left" onClick={() => { const renewed = applyGlobalFilter(customers).filter(c => c.status.trim().toLowerCase() === 'renewed').sort((a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b)); setDetailsModalTitle('Renewed Policies'); setDetailsModalCustomers(renewed); setShowDetailsModal(true); }}>
              <h3 className="text-xs text-slate-400 mb-1">Renewed</h3>
              <p className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">{applyGlobalFilter(customers).filter(c => c.status.trim().toLowerCase() === 'renewed').length}</p>
            </button>
            <button className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all text-left" onClick={() => { const inprocess = applyGlobalFilter(customers).filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); return status === 'inprocess' || status === 'inprogress'; }).sort((a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b)); setDetailsModalTitle('In Process'); setDetailsModalCustomers(inprocess); setShowDetailsModal(true); }}>
              <h3 className="text-xs text-slate-400 mb-1">In Process</h3>
              <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{applyGlobalFilter(customers).filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); return status === 'inprocess' || status === 'inprogress'; }).length}</p>
            </button>
            <button className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all text-left" onClick={() => { const expired = applyGlobalFilter(customers).filter(c => getDaysUntilExpiry(c) < 0 && c.status.trim().toLowerCase() === 'due').sort((a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b)); setDetailsModalTitle('Expired Policies'); setDetailsModalCustomers(expired); setShowDetailsModal(true); }}>
              <h3 className="text-xs text-slate-400 mb-1">Expired</h3>
              <p className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">{applyGlobalFilter(customers).filter(c => getDaysUntilExpiry(c) < 0 && c.status.trim().toLowerCase() === 'due').length}</p>
            </button>
            <button className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all text-left" onClick={() => { const lost = applyGlobalFilter(customers).filter(c => c.status.trim().toLowerCase() === 'not renewed').sort((a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b)); setDetailsModalTitle('Lost Policies'); setDetailsModalCustomers(lost); setShowDetailsModal(true); }}>
              <h3 className="text-xs text-slate-400 mb-1">Lost</h3>
              <p className="text-2xl font-bold bg-gradient-to-r from-gray-400 to-slate-400 bg-clip-text text-transparent">{applyGlobalFilter(customers).filter(c => c.status.trim().toLowerCase() === 'not renewed').length}</p>
            </button>
            <button className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all text-left" onClick={() => { const now = new Date(); const thisMonth = applyGlobalFilter(customers).filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); if (status !== 'renewed' && status !== 'inprocess' && status !== 'inprogress') return false; const dateStr = (c.renewal_date?.trim() || c.od_expiry_date?.trim()); if (!dateStr) return false; try { const [d, m, y] = dateStr.split('/'); const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); } catch (e) { return false; } }).sort((a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b)); setDetailsModalTitle('This Month Premium'); setDetailsModalCustomers(thisMonth); setShowDetailsModal(true); }}>
              <h3 className="text-xs text-slate-400 mb-1">Month Prem</h3>
              <p className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent break-words">₹{(() => { const now = new Date(); const thisMonth = applyGlobalFilter(customers).filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); if (status !== 'renewed' && status !== 'inprocess' && status !== 'inprogress') return false; const dateStr = (c.renewal_date?.trim() || c.od_expiry_date?.trim()); if (!dateStr) return false; try { const [d, m, y] = dateStr.split('/'); const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); } catch (e) { return false; } }); return thisMonth.reduce((sum, c) => sum + parseAmount(c.premium), 0).toLocaleString(); })()}</p>
            </button>
            <button className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70 transition-all text-left" onClick={() => { const now = new Date(); const thisYear = applyGlobalFilter(customers).filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); if (status !== 'renewed' && status !== 'inprocess' && status !== 'inprogress') return false; const dateStr = (c.renewal_date?.trim() || c.od_expiry_date?.trim()); if (!dateStr) return false; try { const [d, m, y] = dateStr.split('/'); const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); return date.getFullYear() === now.getFullYear(); } catch (e) { return false; } }).sort((a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b)); setDetailsModalTitle('This Year Premium'); setDetailsModalCustomers(thisYear); setShowDetailsModal(true); }}>
              <h3 className="text-xs text-slate-400 mb-1">Year Prem</h3>
              <p className="text-lg font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent break-words">₹{(() => { const now = new Date(); const thisYear = applyGlobalFilter(customers).filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); if (status !== 'renewed' && status !== 'inprocess' && status !== 'inprogress') return false; const dateStr = (c.renewal_date?.trim() || c.od_expiry_date?.trim()); if (!dateStr) return false; try { const [d, m, y] = dateStr.split('/'); const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); return date.getFullYear() === now.getFullYear(); } catch (e) { return false; } }); return thisYear.reduce((sum, c) => sum + parseAmount(c.premium), 0).toLocaleString(); })()}</p>
            </button>
          </div>
        </div>
      )}
      {renderTabContent()}
    </div>


      {/* Add Customer Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setDynamicFormData({}); }}
        title="Add New Customer"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          {sheetFields.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Loading form fields...</p>
          ) : (
            sheetFields
              .filter(field => !['S NO', 's no', 'S_NO'].includes(field)) // Skip serial number
              .map((field) => {
              const key = field.toLowerCase().replace(/\s+/g, '_').replace(/&amp;/g, '&');
              const isRequired = key === 'name' || key === 'mobile_number' || key === 'mobile_no';
              const isDate = key.includes('date') || key.includes('expiry');
              const isTextarea = key === 'notes' || key === 'remarks';
              const isSelect = key === 'status';
              const isTypeField = key === 'vertical' || key === 'type';
              const isProductType = key === 'product_type';
              
              if (isTextarea) {
                return (
                  <div key={key}>
                    <label className="text-sm text-slate-300 mb-1 block">{field}{isRequired && ' *'}</label>
                    <textarea
                      className="w-full p-2 border rounded bg-slate-700 text-white"
                      placeholder={field}
                      value={dynamicFormData[key] || ''}
                      onChange={(e) => setDynamicFormData({...dynamicFormData, [key]: e.target.value})}
                      rows={3}
                    />
                  </div>
                );
              }
              
              if (isTypeField) {
                return (
                  <div key={key}>
                    <label className="text-sm text-slate-300 mb-1 block">{field}</label>
                    <select
                      className="w-full p-2 border rounded bg-slate-700 text-white"
                      value={dynamicFormData[key] || 'motor'}
                      onChange={(e) => {
                        setDynamicFormData({...dynamicFormData, [key]: e.target.value, product_type: ''});
                      }}
                    >
                      <option value="motor">Motor</option>
                      <option value="health">Health</option>
                      <option value="non-motor">Non-Motor</option>
                    </select>
                  </div>
                );
              }
              
              if (isProductType) {
                const selectedType = dynamicFormData['vertical'] || dynamicFormData['type'] || 'motor';
                return (
                  <div key={key}>
                    <label className="text-sm text-slate-300 mb-1 block">{field}</label>
                    <select
                      className="w-full p-2 border rounded bg-slate-700 text-white"
                      value={dynamicFormData[key] || ''}
                      onChange={(e) => setDynamicFormData({...dynamicFormData, [key]: e.target.value})}
                    >
                      <option value="">Select...</option>
                      {selectedType.toLowerCase() === 'motor' && (
                        <>
                          <option value="2WH">2 Wheeler</option>
                          <option value="4WH">4 Wheeler</option>
                        </>
                      )}
                      {selectedType.toLowerCase() === 'health' && (
                        <>
                          <option value="Base">Base</option>
                          <option value="Topup">Topup</option>
                        </>
                      )}
                    </select>
                  </div>
                );
              }
              
              if (isSelect) {
                return (
                  <div key={key}>
                    <label className="text-sm text-slate-300 mb-1 block">{field}</label>
                    <select
                      className="w-full p-2 border rounded bg-slate-700 text-white"
                      value={dynamicFormData[key] || 'due'}
                      onChange={(e) => setDynamicFormData({...dynamicFormData, [key]: e.target.value})}
                    >
                      <option value="due">DUE</option>
                      <option value="renewed">Renewed</option>
                      <option value="not renewed">Not Renewed</option>
                      <option value="inprocess">In Process</option>
                    </select>
                  </div>
                );
              }
              
              if (isDate) {
                return (
                  <div key={key}>
                    <label className="text-sm text-slate-300 mb-1 block">{field}{isRequired && ' *'}</label>
                    <Input
                      type="date"
                      value={dynamicFormData[key] || ''}
                      onChange={(e) => setDynamicFormData({...dynamicFormData, [key]: e.target.value})}
                    />
                  </div>
                );
              }
              
              const inputType = key.includes('email') ? 'email' : (key === 'premium' || key === 'amount') ? 'number' : 'text';
              
              return (
                <div key={key}>
                  <label className="text-sm text-slate-300 mb-1 block">{field}{isRequired && ' *'}</label>
                  <Input
                    type={inputType}
                    placeholder={field}
                    value={dynamicFormData[key] || ''}
                    onChange={(e) => setDynamicFormData({...dynamicFormData, [key]: e.target.value})}
                    required={isRequired}
                  />
                </div>
              );
            })
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-600">
            <Button onClick={handleAddCustomer}>Add Customer</Button>
            <Button variant="outline" onClick={() => { setShowAddModal(false); setDynamicFormData({}); }}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Details Modal - Shared across all tabs */}
      <Modal open={showDetailsModal} onClose={() => { setShowDetailsModal(false); setModalSearchTerm(''); }} title={detailsModalTitle}>
        <div className="space-y-3">
          {detailsModalCustomers.length > 1 && (
            <Input
              placeholder="Search by name, mobile, G CODE, vehicle, etc..."
              value={modalSearchTerm}
              onChange={(e) => handleSearchChange('modalSearch', e.target.value)}
              className="w-full"
            />
          )}
          <div className="max-h-[70vh] overflow-y-auto space-y-3">
            {(() => {
              const filtered = sortCustomersByExpiry(detailsModalCustomers.filter(c => {
                if (!modalSearchTerm) return true;
                const searchLower = modalSearchTerm.toLowerCase();
                return Object.entries(c).some(([key, value]) => {
                  if (value === null || value === undefined) return false;
                  return String(value).toLowerCase().includes(searchLower);
                });
              }));
              
              return filtered.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No customers found</p>
            ) : (
              filtered.map((customer) => {
                const isRenewed = customer.status?.trim().toLowerCase() === 'renewed';
                const displayDate = getDisplayDate(customer);
                return (
              <div key={customer.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:bg-slate-700/70 transition-all space-y-3">
                {isRenewed && (customer.new_company || customer.new_policy_no) && (
                  <div className="pb-3 border-b border-slate-600">
                    <h5 className="text-xs font-semibold text-green-400 mb-2">NEW POLICY DETAILS</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {customer.new_company && <div><span className="text-slate-400">Company:</span> <span className="text-green-400 font-medium">{customer.new_company}</span></div>}
                      {customer.new_policy_no && <div><span className="text-slate-400">Policy No:</span> <span className="text-green-400 font-medium">{customer.new_policy_no}</span></div>}
                      <div><span className="text-slate-400">Next Renewal:</span> <span className="text-green-400 font-medium">{calculateNextRenewalDate(displayDate, customer.premium_mode)}</span></div>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <h4 className="font-bold text-white text-sm">{customer.name}</h4>
                    {customer.g_code && <span className="text-cyan-400 font-medium">G: {customer.g_code}</span>}
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      customer.status === 'renewed' ? 'bg-green-500/20 text-green-300' : 
                      customer.status === 'not renewed' ? 'bg-red-500/20 text-red-300' : 
                      customer.status === 'inprocess' ? 'bg-blue-500/20 text-blue-300' : 
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {customer.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {customer.s_no && <div><span className="text-slate-400">S No:</span> <span className="text-white">{customer.s_no}</span></div>}
                    {customer.g_code && <div><span className="text-slate-400">G Code:</span> <span className="text-cyan-400 font-medium">{customer.g_code}</span></div>}
                    {customer.mobile_number && <div><span className="text-slate-400">Mobile No:</span> <span className="text-white">{customer.mobile_number}</span></div>}
                    {customer.email && <div><span className="text-slate-400">Email ID:</span> <span className="text-white">{customer.email}</span></div>}
                    {customer.registration_no && <div><span className="text-slate-400">Veh No:</span> <span className="text-white">{customer.registration_no}</span></div>}
                    {customer.current_policy_no && <div><span className="text-slate-400">Policy No:</span> <span className="text-white">{customer.current_policy_no}</span></div>}
                    {customer.company && <div><span className="text-slate-400">Company:</span> <span className="text-white">{customer.company}</span></div>}
                    {customer.premium && <div><span className="text-slate-400">Amount:</span> <span className="text-white font-bold">₹{parseAmount(customer.premium).toLocaleString()}</span></div>}
                    {customer.last_year_premium && <div><span className="text-slate-400">Last Year Premium:</span> <span className="text-white">₹{parseAmount(customer.last_year_premium).toLocaleString()}</span></div>}
                    {displayDate && <div><span className="text-slate-400">Policy Expiry Date:</span> <span className="text-orange-400 font-medium">{displayDate}</span></div>}
                    {customer.tp_expiry_date && <div><span className="text-slate-400">TP Expiry Date:</span> <span className="text-white">{customer.tp_expiry_date}</span></div>}
                    {customer.premium_mode && <div><span className="text-slate-400">Premium Mode:</span> <span className="text-white">{customer.premium_mode}</span></div>}
                    {customer.vertical && <div><span className="text-slate-400">Category:</span> <span className="text-white capitalize">{customer.vertical}</span></div>}
                    {customer.product_type && <div><span className="text-slate-400">Product Type:</span> <span className="text-white">{customer.product_type}</span></div>}
                    {customer.product_model && <div><span className="text-slate-400">Product Model:</span> <span className="text-white">{customer.product_model}</span></div>}
                    {customer.payment_date && <div><span className="text-slate-400">Payment Date:</span> <span className="text-white">{customer.payment_date}</span></div>}
                    {customer.cheque_no && <div><span className="text-slate-400">Cheque No:</span> <span className="text-white">{customer.cheque_no}</span></div>}
                    {customer.bank_name && <div><span className="text-slate-400">Bank Name:</span> <span className="text-white">{customer.bank_name}</span></div>}
                    {customer.customer_id && <div><span className="text-slate-400">Customer ID:</span> <span className="text-white">{customer.customer_id}</span></div>}
                    {customer.agent_code && <div><span className="text-slate-400">Agent Code:</span> <span className="text-white">{customer.agent_code}</span></div>}
                    {(customer as any).dob && <div><span className="text-slate-400">DOB:</span> <span className="text-white">{(customer as any).dob}</span></div>}
                    {(customer as any).gst_no && <div><span className="text-slate-400">GST NO:</span> <span className="text-white">{(customer as any).gst_no}</span></div>}
                    {customer.reason && <div className="col-span-2"><span className="text-slate-400">Remarks:</span> <span className="text-white">{customer.reason}</span></div>}
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-600 flex-wrap">
                  <select 
                    className="px-2 py-1 text-xs border border-cyan-500/50 rounded bg-slate-800 text-white font-medium hover:bg-slate-700 cursor-pointer"
                    onChange={(e) => { if (e.target.value) { handleBulkStatusUpdate(e.target.value, [customer.id]); e.target.value = ''; } }}
                    defaultValue=""
                  >
                    <option value="" disabled>Mark as...</option>
                    <option value="due">🔴 DUE</option>
                    <option value="renewed">🟢 RENEWED</option>
                    <option value="inprocess">🔵 IN PROCESS</option>
                    <option value="not renewed">⚫ NOT RENEWED</option>
                  </select>
                  <Button size="sm" onClick={(e) => {
                    e.stopPropagation();
                    const message = generatePolicyDetailsMessage({
                      customerName: customer.name,
                      vehicleNumber: customer.registration_no,
                      companyName: isRenewed ? customer.new_company : customer.company,
                      renewalDate: displayDate,
                      policyNumber: isRenewed ? customer.new_policy_no : customer.current_policy_no,
                      policyType: customer.vertical,
                      premiumAmount: customer.premium?.toString(),
                      clientKey
                    });
                    logWhatsAppMessage(customer.id, customer.name, message);
                    window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
                  }} className="px-2 py-1 text-xs">💬 WhatsApp</Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setNoteCustomerId(customer.id);
                      setShowNoteModal(true);
                    }}
                    className="px-2 py-1 text-xs"
                  >
                    📝 Note
                  </Button>
                </div>
              </div>
            );
              })
          );
          })()}
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

      {/* Renewal Update Modal */}
      <Modal open={showRenewalUpdateModal} onClose={() => { setShowRenewalUpdateModal(false); setBulkRenewalData({}); }} title={`Update ${selectedCustomers.length} Customer${selectedCustomers.length > 1 ? 's' : ''}`}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {selectedCustomers.map((customerId) => {
            const customer = customers.find(c => c.id === customerId);
            if (!customer) return null;
            
            const data = bulkRenewalData[customerId] || { payment_date: '', cheque_no: '', bank_name: '', customer_id: '', agent_code: '', amount: '', new_policy_no: '', new_company: '', paid_by: '', remarks: '', status: 'RENEWED' };
            
            return (
              <div key={customerId} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 space-y-3">
                <div className="border-b border-slate-600 pb-3 mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-white text-lg">{customer.name}</h4>
                      <p className="text-xs text-slate-300 mt-1">{customer.mobile_number}</p>
                    </div>
                    <p className="text-sm text-cyan-400 font-bold">₹{customer.premium?.toLocaleString()}</p>
                  </div>
                  {(() => {
                    const isRenewed = customer.status?.trim().toLowerCase() === 'renewed';
                    if (isRenewed && (customer.new_policy_no || customer.new_company)) {
                      return (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-slate-400">New Policy No:</span> <span className="text-green-400 font-medium">{customer.new_policy_no || 'N/A'}</span></div>
                          <div><span className="text-slate-400">New Company:</span> <span className="text-green-400 font-medium">{customer.new_company || 'N/A'}</span></div>
                          <div><span className="text-slate-400">G Code:</span> <span className="text-cyan-400 font-medium">{customer.g_code || 'N/A'}</span></div>
                          <div><span className="text-slate-400">Vehicle:</span> <span className="text-white font-medium">{customer.registration_no || 'N/A'}</span></div>
                          <div className="col-span-2"><span className="text-slate-400">Old Policy:</span> <span className="text-slate-500 text-[10px]">{customer.current_policy_no || 'N/A'} ({customer.company || 'N/A'})</span></div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-slate-400">Policy No:</span> <span className="text-white font-medium">{customer.current_policy_no || 'N/A'}</span></div>
                          <div><span className="text-slate-400">Company:</span> <span className="text-white font-medium">{customer.company || 'N/A'}</span></div>
                          <div><span className="text-slate-400">Vehicle:</span> <span className="text-white font-medium">{customer.registration_no || 'N/A'}</span></div>
                          <div><span className="text-slate-400">G Code:</span> <span className="text-cyan-400 font-medium">{customer.g_code || 'N/A'}</span></div>
                        </div>
                      );
                    }
                  })()}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-300 mb-1 block">Status *</label>
                    <select
                      className="w-full p-2 border rounded bg-slate-700 text-white text-sm"
                      value={data.status}
                      onChange={(e) => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, status: e.target.value}})}
                    >
                      <option value="DUE">DUE</option>
                      <option value="RENEWED">RENEWED</option>
                      <option value="INPROCESS">IN PROCESS</option>
                      <option value="NOT RENEWED">NOT RENEWED</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 mb-1 block">DEPOSITED/PAYMENT DATE</label>
                    <Input
                      type="date"
                      placeholder={customer.payment_date || 'YYYY-MM-DD'}
                      value={data.payment_date}
                      onChange={(e) => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, payment_date: e.target.value}})}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 mb-1 block">CHQ NO & DATE</label>
                    <input
                      type="text"
                      placeholder={customer.cheque_no || customer.paid_by || 'Cheque number & date'}
                      value={data.cheque_no}
                      onChange={(e) => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, cheque_no: e.target.value}})}
                      className="w-full p-2 border rounded bg-slate-700 text-white text-sm"
                    />
                  </div>
                  <div className="relative">
                    <label className="text-xs text-slate-300 mb-1 block">BANK NAME</label>
                    <input
                      type="text"
                      placeholder={customer.bank_name || 'Search bank...'}
                      value={data.bank_name}
                      onChange={(e) => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, bank_name: e.target.value}})}
                      className="w-full p-2 border rounded bg-slate-700 text-white text-sm"
                      autoComplete="off"
                    />
                    {data.bank_name && !['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'SBI', 'Kotak Mahindra Bank', 'IndusInd Bank', 'IDBI Bank', 'Bank of Baroda', 'Punjab National Bank', 'Canara Bank', 'Union Bank of India', 'Bank of India', 'Central Bank of India', 'Indian Bank', 'Yes Bank', 'RBL Bank', 'IDFCFIRST Bank', 'Federal Bank', 'Karur Vysya Bank', 'South Indian Bank', 'Bandhan Bank', 'ICICI Prudential', 'HDFC Life', 'LIC', 'Bajaj Allianz', 'Reliance General', 'TATA AIG', 'New India Assurance', 'Oriental Insurance', 'United India Insurance'].includes(data.bank_name) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                        {['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'SBI', 'Kotak Mahindra Bank', 'IndusInd Bank', 'IDBI Bank', 'Bank of Baroda', 'Punjab National Bank', 'Canara Bank', 'Union Bank of India', 'Bank of India', 'Central Bank of India', 'Indian Bank', 'Yes Bank', 'RBL Bank', 'IDFCFIRST Bank', 'Federal Bank', 'Karur Vysya Bank', 'South Indian Bank', 'Bandhan Bank', 'ICICI Prudential', 'HDFC Life', 'LIC', 'Bajaj Allianz', 'Reliance General', 'TATA AIG', 'New India Assurance', 'Oriental Insurance', 'United India Insurance'].filter(bank => bank.toLowerCase().includes(data.bank_name.toLowerCase())).map(bank => (
                          <div
                            key={bank}
                            className="px-3 py-2 hover:bg-slate-600 cursor-pointer text-white text-sm"
                            onClick={() => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, bank_name: bank}})}
                          >
                            {bank}
                          </div>
                        ))}
                        <div
                          className="px-3 py-2 hover:bg-slate-600 cursor-pointer text-white text-sm border-t border-slate-600 font-medium"
                          onClick={() => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, bank_name: 'Others', show_other_bank: true}})}
                        >
                          Others
                        </div>
                      </div>
                    )}
                    {data.show_other_bank && (
                      <input
                        type="text"
                        placeholder="Enter bank name"
                        value={data.other_bank_name || ''}
                        onChange={(e) => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, other_bank_name: e.target.value, bank_name: e.target.value}})}
                        className="w-full p-2 border rounded bg-slate-700 text-white text-sm mt-2"
                        autoFocus
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 mb-1 block">CUSTOMER ID</label>
                    <Input
                      type="text"
                      placeholder={customer.customer_id || 'Customer ID'}
                      value={data.customer_id}
                      onChange={(e) => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, customer_id: e.target.value}})}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 mb-1 block">AGENT CODE</label>
                    <Input
                      type="text"
                      placeholder={customer.agent_code || 'Agent code'}
                      value={data.agent_code}
                      onChange={(e) => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, agent_code: e.target.value}})}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 mb-1 block">AMOUNT</label>
                    <Input
                      type="number"
                      placeholder={customer.premium?.toString() || '0'}
                      value={data.amount}
                      onChange={(e) => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, amount: e.target.value}})}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 mb-1 block">NEW POLICY NO</label>
                    <Input
                      type="text"
                      placeholder={customer.new_policy_no || 'New policy number'}
                      value={data.new_policy_no}
                      onChange={(e) => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, new_policy_no: e.target.value}})}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 mb-1 block">NEW POLICY COMPANY</label>
                    <Input
                      type="text"
                      placeholder={customer.new_company || customer.company || 'Company'}
                      value={data.new_company}
                      onChange={(e) => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, new_company: e.target.value}})}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 mb-1 block">Paid By</label>
                    <Input
                      type="text"
                      placeholder={customer.paid_by || 'Payment method'}
                      value={data.paid_by}
                      onChange={(e) => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, paid_by: e.target.value}})}
                      className="text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-slate-300 mb-1 block">Remarks</label>
                  <textarea
                    className="w-full p-2 border rounded bg-slate-700 text-white text-sm min-h-[60px]"
                    placeholder="Remarks"
                    value={data.remarks}
                    onChange={(e) => setBulkRenewalData({...bulkRenewalData, [customerId]: {...data, remarks: e.target.value}})}
                  />
                </div>
              </div>
            );
          })}
          
          <div className="flex gap-3 pt-4 border-t border-slate-600 sticky bottom-0 bg-slate-800 p-3 -mx-1">
            <Button onClick={async () => {
              try {
                console.log('Starting bulk update for', selectedCustomers.length, 'customers');
                
                for (const customerId of selectedCustomers) {
                  const customer = customers.find(c => c.id === customerId);
                  if (!customer) continue;
                  
                  const data = bulkRenewalData[customerId] || {};
                  
                  const updatePayload = {
                    ...customer,
                    payment_date: data.payment_date || customer.payment_date,
                    cheque_no: data.cheque_no || customer.cheque_no,
                    bank_name: data.bank_name || customer.bank_name,
                    customer_id: data.customer_id || customer.customer_id,
                    agent_code: data.agent_code || customer.agent_code,
                    premium: data.amount ? parseFloat(data.amount) : customer.premium,
                    new_policy_no: data.new_policy_no || customer.new_policy_no,
                    new_company: data.new_company || customer.new_company,
                    paid_by: data.paid_by || customer.paid_by,
                    notes: data.remarks || customer.notes,
                    status: data.status || 'RENEWED'
                  };
                  
                  console.log(`Updating customer ${customerId}:`, updatePayload);
                  await api.put(`/api/insurance/customers/${customerId}`, updatePayload);
                }
                
                console.log('All customers updated, now syncing to sheet...');
                const syncResult = await api.post('/api/insurance/sync/to-sheet', { tabName: SHEET_TAB_NAME });
                console.log('Sync result:', syncResult.data);
                
                setShowRenewalUpdateModal(false);
                setBulkRenewalData({});
                setSelectedCustomers([]);
                await loadData();
                
                if (syncResult.data.message === 'No changes to sync') {
                  alert(`✅ Updated ${selectedCustomers.length} customer(s) in database!\n\nNote: Sheet already up to date.`);
                } else {
                  alert(`✅ Updated and synced ${selectedCustomers.length} customer(s)!\n\nSheet Updates:\n- Updated: ${syncResult.data.updated || 0}\n- Added: ${syncResult.data.added || 0}`);
                }
              } catch (error) {
                console.error('Update failed:', error);
                alert(`❌ Failed to update customers: ${error.response?.data?.error || error.message}`);
              }
            }}>Update All & Sync to Sheet</Button>
            <Button variant="outline" onClick={() => { setShowRenewalUpdateModal(false); setBulkRenewalData({}); }}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Unique Customers Modal */}
      <Modal open={showUniqueCustomersModal} onClose={() => { setShowUniqueCustomersModal(false); setUniqueCustomersSearchTerm(''); }} title={`Unique Customers (${getUniqueCustomerCount()})`}>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search by name, mobile, G code..."
              value={uniqueCustomersSearchTerm}
              onChange={(e) => setUniqueCustomersSearchTerm(e.target.value)}
              className="w-full sm:flex-1"
            />
            <input
              type="month"
              value={uniqueCustomersMonthFilter}
              onChange={(e) => setUniqueCustomersMonthFilter(e.target.value)}
              className="px-3 py-2 border rounded bg-slate-700 text-white text-sm whitespace-nowrap"
            />
          </div>
          <div className="max-h-[65vh] overflow-y-auto space-y-4">
            {(() => {
              const uniqueGroups = getUniqueCustomers();
              if (uniqueGroups.length === 0) return <p className="text-center text-slate-400 py-8">No unique customers found</p>;
              
              const filtered = uniqueGroups.filter(group => {
                const primary = group[0];
                const search = uniqueCustomersSearchTerm.toLowerCase();
                const matchesSearch = !search || primary.name?.toLowerCase().includes(search) || primary.mobile_number?.includes(search) || primary.g_code?.toLowerCase().includes(search);
                if (!matchesSearch) return false;
                
                if (uniqueCustomersMonthFilter) {
                  const [year, month] = uniqueCustomersMonthFilter.split('-').map(Number);
                  return group.some(c => {
                    const date = getDisplayDate(c);
                    if (!date) return false;
                    try {
                      const [d, m, y] = date.split('/');
                      return parseInt(y) === year && parseInt(m) === month;
                    } catch (e) { return false; }
                  });
                }
                return true;
              });
              
              if (filtered.length === 0) return <p className="text-center text-slate-400 py-8">No matches found</p>;
              
              return filtered.map((group, idx) => {
                const primary = group[0];
                const totalPremium = group.reduce((sum, c) => sum + parseAmount(c.premium), 0);
                
                return (
                  <div key={idx} className="bg-slate-700/50 rounded-lg border border-slate-600/50 p-4 space-y-3">
                    <div className="border-b border-slate-600 pb-3">
                      <h4 className="font-bold text-white text-lg">{primary.name}</h4>
                      <div className="flex justify-between items-start mt-2">
                        <div className="text-xs text-slate-300 space-y-1">
                          <p>📱 {primary.mobile_number}</p>
                          {primary.g_code && <p className="text-cyan-400 font-medium">G Code: {primary.g_code}</p>}
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-slate-300">Policies: <span className="text-cyan-400 font-bold">{group.length}</span></p>
                          <p className="text-slate-300 mt-1">Total: <span className="text-green-400 font-bold">₹{totalPremium.toLocaleString()}</span></p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {group.map((customer, pIdx) => {
                        const displayDate = getDisplayDate(customer);
                        const isRenewed = customer.status?.trim().toLowerCase() === 'renewed';
                        
                        return (
                          <div key={pIdx} className="bg-slate-800/50 rounded border border-slate-600/30 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                customer.status === 'renewed' ? 'bg-green-500/20 text-green-300' : 
                                customer.status === 'not renewed' ? 'bg-red-500/20 text-red-300' : 
                                customer.status === 'inprocess' ? 'bg-blue-500/20 text-blue-300' : 
                                'bg-yellow-500/20 text-yellow-300'
                              }`}>
                                {customer.status.toUpperCase()}
                              </span>
                              <span className="text-sm font-bold text-white">₹{parseAmount(customer.premium).toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {customer.company && <div><span className="text-slate-400">Company:</span> <span className="text-white">{customer.company}</span></div>}
                              {customer.current_policy_no && <div><span className="text-slate-400">Policy:</span> <span className="text-cyan-400">{customer.current_policy_no}</span></div>}
                              {customer.registration_no && <div><span className="text-slate-400">Vehicle:</span> <span className="text-white">{customer.registration_no}</span></div>}
                              {customer.vertical && <div><span className="text-slate-400">Category:</span> <span className="text-white capitalize">{customer.vertical}</span></div>}
                              {customer.product_type && <div><span className="text-slate-400">Type:</span> <span className="text-white">{customer.product_type}</span></div>}
                              {customer.product_model && <div><span className="text-slate-400">Model:</span> <span className="text-white">{customer.product_model}</span></div>}
                              {displayDate && <div><span className="text-slate-400">Expiry:</span> <span className={isRenewed ? 'text-green-400' : 'text-orange-400'}>{displayDate}</span></div>}
                              {customer.premium_mode && <div><span className="text-slate-400">Mode:</span> <span className="text-white">{customer.premium_mode}</span></div>}
                            </div>
                            {isRenewed && (customer.new_company || customer.new_policy_no) && (
                              <div className="pt-2 border-t border-slate-600/50 text-xs">
                                <p className="text-green-400 font-semibold mb-1">NEW POLICY</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {customer.new_company && <div><span className="text-slate-400">Company:</span> <span className="text-green-400">{customer.new_company}</span></div>}
                                  {customer.new_policy_no && <div><span className="text-slate-400">Policy:</span> <span className="text-green-400">{customer.new_policy_no}</span></div>}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
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
            <div>
              <label className="text-sm text-slate-300 mb-1 block">Name *</label>
              <Input
                type="text"
                placeholder="Name"
                value={editingCustomer.name || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-1 block">DOB</label>
              <Input
                type="date"
                value={editingCustomer.dob?.includes('/') ? editingCustomer.dob.split('/').reverse().join('-') : editingCustomer.dob || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, dob: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-1 block">G Code</label>
              <Input
                type="text"
                placeholder="G Code"
                value={editingCustomer.g_code || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, g_code: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-1 block">Mobile No *</label>
              <Input
                type="text"
                placeholder="Mobile No"
                value={editingCustomer.mobile_number || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, mobile_number: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-1 block">Email</label>
              <Input
                type="email"
                placeholder="Email"
                value={editingCustomer.email || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-1 block">PAN Number</label>
              <Input
                type="text"
                placeholder="PAN Number"
                value={editingCustomer.pancard || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, pancard: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-1 block">Aadhar Number</label>
              <Input
                type="text"
                placeholder="Aadhar Number"
                value={editingCustomer.aadhar_card || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, aadhar_card: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-1 block">GST No</label>
              <Input
                type="text"
                placeholder="GST No"
                value={editingCustomer.gst_no || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, gst_no: e.target.value})}
              />
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-slate-600">
              <Button onClick={handleUpdateCustomer}>Update Customer</Button>
              <Button variant="outline" onClick={() => setEditingCustomer(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
