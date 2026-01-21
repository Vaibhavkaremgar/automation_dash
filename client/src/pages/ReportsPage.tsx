import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { api } from '../lib/api';
import { getThankYouMessage, getOverdueMessage, getUrgentMessage, get7DayMessage, get30DayMessage, getClaimUpdateMessage, getPolicySummaryMessage } from '../utils/messageTemplates';

const getClaimTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    own_damage: 'Own Damage',
    third_party: 'Third Party',
    theft: 'Theft',
    total_loss: 'Total Loss',
    hospitalization: 'Hospitalization',
    surgery: 'Surgery',
    outpatient: 'Outpatient',
    maternity: 'Maternity',
    fire: 'Fire',
    burglary: 'Burglary',
    natural_disaster: 'Natural Disaster',
    property_damage: 'Property Damage',
    death: 'Death',
    disability: 'Disability',
    critical_illness: 'Critical Illness',
    maturity: 'Maturity'
  };
  return labels[type] || type;
};

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

interface ReportData {
  renewalPerformance: {
    expiringThisMonth: number;
    renewedSoFar: number;
    inProcess: number;
    lost: number;
    pendingRenewals: number;
    expiredWithoutRenewal: number;
    conversionRate: number;
    monthlyTrend: Array<{ month: string; renewed: number; expired: number; lost: number }>;
    customers: Array<any>;
  };
  premiumCollection: {
    collectedThisMonth: number;
    collectedThisYear: number;
    highestCustomer: { name: string; premium: number };
    highestCompany: { name: string; premium: number };
    monthlyPremium: Array<{ month: string; amount: number }>;
    byCompany: Array<{ company: string; amount: number }>;
    customers: Array<any>;
  };
  customerGrowth: {
    newThisMonth: number;
    totalActive: number;
    totalInactive: number;
    retentionRate: number;
    growthTrend: Array<{ month: string; count: number }>;
    customers: Array<any>;
  };
  claimsSummary: {
    totalFiled: number;
    approved: number;
    rejected: number;
    inProgress: number;
    avgSettlementDays: number;
    byInsurer: Array<{ company: string; count: number }>;
    byType: Array<{ type: string; count: number }>;
    claims: Array<any>;
  };
}

export default function ReportsPage() {
  const sortCustomersByExpiry = (custs: any[]) => {
    return [...custs].sort((a, b) => {
      const getExpiry = (c: any) => {
        const dateStr = c.renewal_date || c.od_expiry_date;
        if (!dateStr) return 999;
        try {
          const [d, m, y] = dateStr.split('/');
          const expiry = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          expiry.setHours(0, 0, 0, 0);
          return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        } catch (e) {
          return 999;
        }
      };
      return getExpiry(a) - getExpiry(b);
    });
  };

  const applyMonthFilter = (custs: any[]) => {
    if (!reportMonthFilter) return custs;
    const [filterYear, filterMonth] = reportMonthFilter.split('-').map(Number);
    return custs.filter(c => {
      const dateStr = c.renewal_date || c.od_expiry_date;
      if (!dateStr) return false;
      try {
        const [d, m, y] = dateStr.split('/');
        return parseInt(y) === filterYear && parseInt(m) === filterMonth;
      } catch (e) {
        return false;
      }
    });
  };

  const [verticalFilter, setVerticalFilter] = useState(() => {
    return localStorage.getItem('insuranceVerticalFilter') || 'general';
  });
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState('renewal');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsModalTitle, setDetailsModalTitle] = useState('');
  const [detailsModalCustomers, setDetailsModalCustomers] = useState<any[]>([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [reportMonthFilter, setReportMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const handleVerticalChange = (e: any) => {
      console.log('📊 Reports: Vertical filter changed to:', e.detail);
      setVerticalFilter(e.detail);
      localStorage.setItem('insuranceVerticalFilter', e.detail);
    };
    
    window.addEventListener('insuranceVerticalChange', handleVerticalChange);
    return () => window.removeEventListener('insuranceVerticalChange', handleVerticalChange);
  }, []);

  useEffect(() => {
    console.log('📊 Reports: Loading data with vertical filter:', verticalFilter);
    loadReports();
  }, [verticalFilter, reportMonthFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      let vertical = verticalFilter;
      if (verticalFilter === 'general') {
        vertical = 'general';
      }
      const params = `?vertical=${vertical}&reportMonth=${reportMonthFilter}&_t=${Date.now()}`;
      const response = await api.get(`/api/insurance/reports${params}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!reportData) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
          <h2 className="text-xl font-bold text-yellow-400 mb-2">⚠️ No Data Available</h2>
          <p className="text-slate-300 mb-4">Reports cannot be generated because there is no customer data in the database.</p>
          <p className="text-slate-400 text-sm mb-4">Please sync data from Google Sheets first by going to the Insurance Dashboard and clicking "Sync from Sheets".</p>
          <button 
            onClick={() => window.location.href = '/insurance'}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
          Reports & Analytics
        </h1>
        <Button onClick={loadReports}>Refresh</Button>
      </div>

      {/* Month Filter */}
      <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md z-10 pb-4 pt-2 border border-slate-700/50 rounded-xl mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-300 font-medium">Filter by Month:</label>
          <input
            type="month"
            value={reportMonthFilter}
            onChange={(e) => setReportMonthFilter(e.target.value)}
            className="px-3 py-2 border rounded bg-slate-700 text-white text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 overflow-x-auto">
        <button
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'renewal' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}
          onClick={() => setActiveTab('renewal')}
        >
          <span className="hidden md:inline">Renewal Performance</span>
          <span className="md:hidden text-xs">Renewals</span>
        </button>
        <button
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'premium' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}
          onClick={() => setActiveTab('premium')}
        >
          <span className="hidden md:inline">Premium Collection</span>
          <span className="md:hidden text-xs">Premium</span>
        </button>
        <button
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'growth' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}
          onClick={() => setActiveTab('growth')}
        >
          <span className="hidden md:inline">Customer Growth</span>
          <span className="md:hidden text-xs">Growth</span>
        </button>
        <button
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'claims' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}
          onClick={() => setActiveTab('claims')}
        >
          <span className="hidden md:inline">Claims Summary</span>
          <span className="md:hidden text-xs">Claims</span>
        </button>
      </div>

      {/* Renewal Performance Report */}
      {activeTab === 'renewal' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Total Policies'); setDetailsModalCustomers(sortCustomersByExpiry(applyMonthFilter(reportData.renewalPerformance.customers))); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Total Policies</span><span className="md:hidden">Total</span></h4>
              <p className="text-xl font-semibold text-blue-400">{applyMonthFilter(reportData.renewalPerformance.customers).length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const renewed = sortCustomersByExpiry(applyMonthFilter(reportData.renewalPerformance.customers.filter(c => c.status?.toLowerCase().trim() === 'renewed'))); setDetailsModalTitle('Renewed So Far'); setDetailsModalCustomers(renewed); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Renewed So Far</span><span className="md:hidden">Renewed</span></h4>
              <p className="text-xl font-semibold text-green-400">{applyMonthFilter(reportData.renewalPerformance.customers).filter(c => c.status?.toLowerCase().trim() === 'renewed').length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const inProcess = sortCustomersByExpiry(applyMonthFilter(reportData.renewalPerformance.customers.filter(c => { const status = c.status?.toLowerCase().trim().replace(/[\s-]/g, ''); return status === 'inprocess' || status === 'inprogress'; }))); setDetailsModalTitle('In Process'); setDetailsModalCustomers(inProcess); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">In Process</span><span className="md:hidden">Process</span></h4>
              <p className="text-xl font-semibold text-blue-400">{applyMonthFilter(reportData.renewalPerformance.customers).filter(c => { const status = c.status?.toLowerCase().trim().replace(/[\s-]/g, ''); return status === 'inprocess' || status === 'inprogress'; }).length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const lost = sortCustomersByExpiry(applyMonthFilter(reportData.renewalPerformance.customers.filter(c => c.status?.toLowerCase().trim() === 'not renewed'))); setDetailsModalTitle('Lost Customers'); setDetailsModalCustomers(lost); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Lost</span><span className="md:hidden">Lost</span></h4>
              <p className="text-xl font-semibold text-red-400">{applyMonthFilter(reportData.renewalPerformance.customers).filter(c => c.status?.toLowerCase().trim() === 'not renewed').length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const isExpired = (dateStr) => { if (!dateStr) return false; try { const parts = dateStr.split('/'); if (parts.length === 3) { const day = parseInt(parts[0]); const month = parseInt(parts[1]) - 1; const year = parseInt(parts[2]); const renewalDate = new Date(year, month, day); const today = new Date(); today.setHours(0, 0, 0, 0); return renewalDate < today; } } catch (e) { return false; } return false; }; const upcoming = sortCustomersByExpiry(applyMonthFilter(reportData.renewalPerformance.customers.filter(c => c.status?.toLowerCase().trim() === 'due' && !isExpired(c.renewal_date || c.od_expiry_date)))); setDetailsModalTitle('Upcoming Renewals'); setDetailsModalCustomers(upcoming); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Upcoming Renewals</span><span className="md:hidden">Upcoming</span></h4>
              <p className="text-xl font-semibold text-yellow-400">{(() => { const isExpired = (dateStr) => { if (!dateStr) return false; try { const parts = dateStr.split('/'); if (parts.length === 3) { const day = parseInt(parts[0]); const month = parseInt(parts[1]) - 1; const year = parseInt(parts[2]); const renewalDate = new Date(year, month, day); const today = new Date(); today.setHours(0, 0, 0, 0); return renewalDate < today; } } catch (e) { return false; } return false; }; return applyMonthFilter(reportData.renewalPerformance.customers).filter(c => c.status?.toLowerCase().trim() === 'due' && !isExpired(c.renewal_date || c.od_expiry_date)).length; })()}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const isExpired = (dateStr) => { if (!dateStr) return false; try { const parts = dateStr.split('/'); if (parts.length === 3) { const day = parseInt(parts[0]); const month = parseInt(parts[1]) - 1; const year = parseInt(parts[2]); const renewalDate = new Date(year, month, day); const today = new Date(); today.setHours(0, 0, 0, 0); return renewalDate < today; } } catch (e) { return false; } return false; }; const expired = sortCustomersByExpiry(applyMonthFilter(reportData.renewalPerformance.customers.filter(c => c.status?.toLowerCase().trim() === 'due' && isExpired(c.renewal_date || c.od_expiry_date)))); setDetailsModalTitle('Expired Policies'); setDetailsModalCustomers(expired); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Expired Policies</span><span className="md:hidden">Expired</span></h4>
              <p className="text-xl font-semibold text-red-400">{applyMonthFilter(reportData.renewalPerformance.customers).filter(c => { const isExpired = (dateStr) => { if (!dateStr) return false; try { const parts = dateStr.split('/'); if (parts.length === 3) { const day = parseInt(parts[0]); const month = parseInt(parts[1]) - 1; const year = parseInt(parts[2]); const renewalDate = new Date(year, month, day); const today = new Date(); today.setHours(0, 0, 0, 0); return renewalDate < today; } } catch (e) { return false; } return false; }; return c.status?.toLowerCase().trim() === 'due' && isExpired(c.renewal_date || c.od_expiry_date); }).length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('All Renewals'); setDetailsModalCustomers(sortCustomersByExpiry(applyMonthFilter(reportData.renewalPerformance.customers))); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Conversion Rate</span><span className="md:hidden">Conv %</span></h4>
              <p className="text-xl font-semibold text-cyan-400">{reportData.renewalPerformance.conversionRate}%</p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Renewal Trend (Last 3 Months)</h3>
            <div className="flex items-end gap-2 h-48 overflow-x-auto">
              {reportData.renewalPerformance.monthlyTrend.map((item, idx) => (
                <div key={idx} className="flex-1 min-w-[80px] flex flex-col items-center gap-1">
                  <div className="w-full flex gap-1 items-end justify-center h-32">
                    <div className="flex-1 bg-green-500/50 rounded" style={{ height: `${(item.renewed / Math.max(...reportData.renewalPerformance.monthlyTrend.map(t => Math.max(t.renewed, t.expired, t.lost)))) * 100}%` }} title="Renewed"></div>
                    <div className="flex-1 bg-red-500/50 rounded" style={{ height: `${(item.expired / Math.max(...reportData.renewalPerformance.monthlyTrend.map(t => Math.max(t.renewed, t.expired, t.lost)))) * 100}%` }} title="Expired"></div>
                    <div className="flex-1 bg-orange-500/50 rounded" style={{ height: `${(item.lost / Math.max(...reportData.renewalPerformance.monthlyTrend.map(t => Math.max(t.renewed, t.expired, t.lost)))) * 100}%` }} title="Lost"></div>
                  </div>
                  <div className="text-slate-400 text-xs">{item.month}</div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>R:{item.renewed}</div>
                    <div>E:{item.expired}</div>
                    <div>L:{item.lost}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-xs justify-center">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500/50 rounded"></div><span>Renewed</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500/50 rounded"></div><span>Expired</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-500/50 rounded"></div><span>Lost</span></div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Customer</span><span className="md:hidden">Cust</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Vehicle</span><span className="md:hidden">Veh</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Expiry Date</span><span className="md:hidden">Expiry</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Amount</span><span className="md:hidden">Amt</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Status</span><span className="md:hidden">Sts</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {applyMonthFilter(reportData.renewalPerformance.customers).map((customer, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 text-sm text-white">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.registration_no}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.renewal_date || customer.od_expiry_date}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">₹{customer.premium}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Premium Collection Report */}
      {activeTab === 'premium' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Premium Collection - This Month'); setDetailsModalCustomers(sortCustomersByExpiry(reportData.premiumCollection.customers)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Collected This Month</span><span className="md:hidden">Month</span></h4>
              <p className="text-xl font-semibold text-green-400">₹{reportData.premiumCollection.collectedThisMonth}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Premium Collection - This Year'); setDetailsModalCustomers(sortCustomersByExpiry(reportData.premiumCollection.customers)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Collected This Year</span><span className="md:hidden">Year</span></h4>
              <p className="text-xl font-semibold text-cyan-400">₹{reportData.premiumCollection.collectedThisYear}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const topCustomer = sortCustomersByExpiry(reportData.premiumCollection.customers.filter(c => c.name === reportData.premiumCollection.highestCustomer.name)); setDetailsModalTitle('Highest Premium Customer'); setDetailsModalCustomers(topCustomer); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Highest Premium Customer</span><span className="md:hidden">Top Cust</span></h4>
              <p className="text-base font-semibold text-purple-400 truncate">{reportData.premiumCollection.highestCustomer.name}</p>
              <p className="text-xs text-slate-400">₹{reportData.premiumCollection.highestCustomer.premium}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const topCompany = sortCustomersByExpiry(reportData.premiumCollection.customers.filter(c => c.company === reportData.premiumCollection.highestCompany.name)); setDetailsModalTitle(`${reportData.premiumCollection.highestCompany.name} - Customers`); setDetailsModalCustomers(topCompany); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Top Insurance Company</span><span className="md:hidden">Top Co</span></h4>
              <p className="text-base font-semibold text-orange-400 truncate">{reportData.premiumCollection.highestCompany.name}</p>
              <p className="text-xs text-slate-400">₹{reportData.premiumCollection.highestCompany.premium}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Month-wise Premium</h3>
              <div className="flex items-end gap-2 h-48">
                {reportData.premiumCollection.monthlyPremium.map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-green-500/30 rounded-t" style={{ height: `${(item.amount / Math.max(...reportData.premiumCollection.monthlyPremium.map(t => t.amount))) * 100}%` }}>
                      <div className="text-center text-white text-xs pt-2">₹{item.amount}</div>
                    </div>
                    <div className="text-slate-400 text-xs mt-2">{item.month}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Premium by Company</h3>
              <div className="space-y-3">
                {reportData.premiumCollection.byCompany.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{item.company}</span>
                      <span className="text-white font-medium">₹{item.amount}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-2 rounded-full" style={{ width: `${(item.amount / Math.max(...reportData.premiumCollection.byCompany.map(c => c.amount))) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Customer</span><span className="md:hidden">Cust</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Company</span><span className="md:hidden">Co</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Amount</span><span className="md:hidden">Amt</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Expiry Date</span><span className="md:hidden">Expiry</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Status</span><span className="md:hidden">Sts</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {reportData.premiumCollection.customers.map((customer, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 text-sm text-white">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.company}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">₹{customer.premium}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.renewal_date || customer.od_expiry_date}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Growth Report */}
      {activeTab === 'growth' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Total Customers'); setDetailsModalCustomers(sortCustomersByExpiry(reportData.customerGrowth.customers)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Total Customers</span><span className="md:hidden">Total</span></h4>
              <p className="text-xl font-semibold text-blue-400">{reportData.customerGrowth.customers.length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const renewed = sortCustomersByExpiry(reportData.customerGrowth.customers.filter(c => c.status?.toLowerCase().trim() === 'renewed')); setDetailsModalTitle('Renewed Customers'); setDetailsModalCustomers(renewed); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Renewed</span><span className="md:hidden">Renewed</span></h4>
              <p className="text-xl font-semibold text-green-400">{reportData.customerGrowth.totalActive}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const notRenewed = sortCustomersByExpiry(reportData.customerGrowth.customers.filter(c => c.status?.toLowerCase().trim() === 'not renewed')); setDetailsModalTitle('Not Renewed (Lost)'); setDetailsModalCustomers(notRenewed); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Not Renewed</span><span className="md:hidden">Lost</span></h4>
              <p className="text-xl font-semibold text-red-400">{reportData.customerGrowth.customers.filter(c => c.status?.toLowerCase().trim() === 'not renewed').length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const due = sortCustomersByExpiry(reportData.customerGrowth.customers.filter(c => c.status?.toLowerCase().trim() === 'due')); setDetailsModalTitle('Due Customers'); setDetailsModalCustomers(due); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Due</span><span className="md:hidden">Due</span></h4>
              <p className="text-xl font-semibold text-yellow-400">{reportData.customerGrowth.customers.filter(c => c.status?.toLowerCase().trim() === 'due').length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('All Customers'); setDetailsModalCustomers(sortCustomersByExpiry(reportData.customerGrowth.customers)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Retention Rate</span><span className="md:hidden">Retain %</span></h4>
              <p className="text-xl font-semibold text-purple-400">{reportData.customerGrowth.retentionRate}%</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('All Customers'); setDetailsModalCustomers(sortCustomersByExpiry(reportData.customerGrowth.customers)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Growth Trend</span><span className="md:hidden">Trend</span></h4>
              <p className="text-xl font-semibold text-cyan-400">{reportData.customerGrowth.customers.length}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Customer Growth Trend</h3>
            <div className="flex items-end gap-4 h-48">
              {reportData.customerGrowth.growthTrend.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-cyan-500/30 rounded-t" style={{ height: `${(item.count / Math.max(...reportData.customerGrowth.growthTrend.map(t => t.count))) * 100}%` }}>
                    <div className="text-center text-white text-sm pt-2">{item.count}</div>
                  </div>
                  <div className="text-slate-400 text-xs mt-2">{item.month}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Customer Name</span><span className="md:hidden">Name</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Mobile</span><span className="md:hidden">Mob</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Added Date</span><span className="md:hidden">Date</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Status</span><span className="md:hidden">Sts</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {reportData.customerGrowth.customers.map((customer, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 text-sm text-white">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.mobile_number}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <Modal open={showDetailsModal} onClose={() => { setShowDetailsModal(false); setModalSearchTerm(''); }} title={detailsModalTitle}>
        <div className="space-y-3">
          <Input
            placeholder="Search by name, mobile, vehicle..."
            value={modalSearchTerm}
            onChange={(e) => setModalSearchTerm(e.target.value)}
            className="w-full"
          />
          <div className="max-h-96 overflow-y-auto space-y-3">
            {detailsModalCustomers.filter(c => 
              (c.name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || '') ||
              (c.mobile_number?.includes(modalSearchTerm) || '') ||
              (c.registration_no?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || '') ||
              (c.customer_name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || '') ||
              (c.vehicle_number?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || '')
            ).length === 0 ? (
              <p className="text-center text-slate-400 py-8">No data found</p>
            ) : (
              detailsModalCustomers.filter(c => 
                (c.name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || '') ||
                (c.mobile_number?.includes(modalSearchTerm) || '') ||
                (c.registration_no?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || '') ||
                (c.customer_name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || '') ||
                (c.vehicle_number?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || '')
              ).map((item, idx) => {
                const isRenewed = item.status?.toLowerCase() === 'renewed';
                return (
              <div key={idx} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:bg-slate-700/70 transition-all">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mb-2">
                      <h4 className="font-bold text-white text-sm">{item.name || item.customer_name}</h4>
                      {item.g_code && <span className="text-cyan-400 font-medium">G: {item.g_code}</span>}
                      {item.customer_id && <span className="text-slate-300">CID: {item.customer_id}</span>}
                      {item.registration_no && <span className="text-slate-300">• {item.registration_no}</span>}
                      {item.vehicle_number && <span className="text-slate-300">• {item.vehicle_number}</span>}
                      {isRenewed ? (
                        <>
                          {item.new_policy_no && <span className="text-green-400 font-medium">• New Pol: {item.new_policy_no}</span>}
                          {item.new_company && <span className="text-green-400 font-medium">• {item.new_company}</span>}
                        </>
                      ) : (
                        <>
                          {item.current_policy_no && <span className="text-cyan-400 font-medium">• Pol: {item.current_policy_no}</span>}
                          {item.company && <span className="text-slate-300">• {item.company}</span>}
                        </>
                      )}
                      {isRenewed ? (
                        <span className="text-green-400 font-medium">• Next Renewal: {calculateNextRenewalDate(item.renewal_date || item.od_expiry_date, item.premium_mode)}</span>
                      ) : (
                        <>
                          {item.renewal_date && <span className="text-orange-400 font-medium">• {item.renewal_date}</span>}
                          {item.od_expiry_date && !item.renewal_date && <span className="text-orange-400 font-medium">• {item.od_expiry_date}</span>}
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      {item.claim_type && <span className="text-slate-400">Type: {getClaimTypeLabel(item.claim_type)}</span>}
                      {item.claim_status && <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.claim_status === 'approved' || item.claim_status === 'settled' ? 'bg-green-500/20 text-green-300' : item.claim_status === 'rejected' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{item.claim_status}</span>}
                      {item.status && <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.status?.toLowerCase() === 'renewed' ? 'bg-green-500/20 text-green-300' : item.status?.toLowerCase() === 'not renewed' ? 'bg-red-500/20 text-red-300' : item.status?.toLowerCase() === 'inprocess' ? 'bg-blue-500/20 text-blue-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{item.status}</span>}
                    </div>
                  </div>
                  {item.mobile_number && <Button size="sm" onClick={() => {
                    const message = `Dear ${item.name || item.customer_name},\n\nPolicy Details:\nVehicle: ${item.registration_no || item.vehicle_number || 'N/A'}\nCompany: ${isRenewed ? (item.new_company || 'N/A') : (item.company || item.insurance_company || 'N/A')}\nPolicy No: ${isRenewed ? (item.new_policy_no || 'N/A') : (item.current_policy_no || 'N/A')}\nExpiry: ${item.renewal_date || item.od_expiry_date || 'N/A'}\nStatus: ${item.status || 'N/A'}\n\nThank you!`;
                    window.open(`https://wa.me/${item.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`);
                  }} className="px-2 py-1 text-xs flex-shrink-0">💬</Button>}
                </div>
              </div>
            );
              })
          )}
          </div>
        </div>
      </Modal>

      {/* Claims Summary Report */}
      {activeTab === 'claims' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('All Filed Claims'); setDetailsModalCustomers(sortCustomersByExpiry(reportData.claimsSummary.claims)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Total Filed</span><span className="md:hidden">Filed</span></h4>
              <p className="text-xl font-semibold text-blue-400">{reportData.claimsSummary.totalFiled}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const approved = sortCustomersByExpiry(reportData.claimsSummary.claims.filter(c => c.claim_status === 'approved' || c.claim_status === 'settled')); setDetailsModalTitle('Approved/Settled Claims'); setDetailsModalCustomers(approved); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Approved</span><span className="md:hidden">Appr</span></h4>
              <p className="text-xl font-semibold text-green-400">{reportData.claimsSummary.approved}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const rejected = sortCustomersByExpiry(reportData.claimsSummary.claims.filter(c => c.claim_status === 'rejected')); setDetailsModalTitle('Rejected Claims'); setDetailsModalCustomers(rejected); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Rejected</span><span className="md:hidden">Rej</span></h4>
              <p className="text-xl font-semibold text-red-400">{reportData.claimsSummary.rejected}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const inProgress = sortCustomersByExpiry(reportData.claimsSummary.claims.filter(c => c.claim_status === 'in_progress' || c.claim_status === 'filed' || c.claim_status === 'survey_done')); setDetailsModalTitle('Claims In Progress'); setDetailsModalCustomers(inProgress); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">In Progress</span><span className="md:hidden">Prog</span></h4>
              <p className="text-xl font-semibold text-orange-400">{reportData.claimsSummary.inProgress}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('All Claims'); setDetailsModalCustomers(sortCustomersByExpiry(reportData.claimsSummary.claims)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Avg Settlement Time</span><span className="md:hidden">Avg Days</span></h4>
              <p className="text-xl font-semibold text-purple-400">{reportData.claimsSummary.avgSettlementDays} days</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Claims by Insurer</h3>
              <div className="space-y-3">
                {reportData.claimsSummary.byInsurer.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{item.company}</span>
                      <span className="text-white font-medium">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{ width: `${(item.count / Math.max(...reportData.claimsSummary.byInsurer.map(c => c.count))) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Claims by Type</h3>
              <div className="space-y-3">
                {reportData.claimsSummary.byType.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{getClaimTypeLabel(item.type)}</span>
                      <span className="text-white font-medium">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full" style={{ width: `${(item.count / Math.max(...reportData.claimsSummary.byType.map(c => c.count))) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Customer</span><span className="md:hidden">Cust</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Vehicle</span><span className="md:hidden">Veh</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Company</span><span className="md:hidden">Co</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Type</span><span className="md:hidden">Typ</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Status</span><span className="md:hidden">Sts</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Filed Date</span><span className="md:hidden">Filed</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Updated Date</span><span className="md:hidden">Upd</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {reportData.claimsSummary.claims.map((claim, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 text-sm text-white">{claim.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{claim.vehicle_number}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{claim.insurance_company}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{getClaimTypeLabel(claim.claim_type)}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{claim.claim_status}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{claim.updated_at ? new Date(claim.updated_at).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
