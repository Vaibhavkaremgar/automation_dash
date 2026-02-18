import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { api } from '../lib/api';
import { getThankYouMessage, getOverdueMessage, getUrgentMessage, get7DayMessage, get30DayMessage, getClaimUpdateMessage, getPolicySummaryMessage } from '../utils/messageTemplates';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

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
    if (!filterEnabled || selectedMonths.length === 0) return custs;
    return custs.filter(c => {
      const dateStr = c.renewal_date || c.od_expiry_date;
      if (!dateStr) return false;
      try {
        const [d, m, y] = dateStr.split('/');
        return parseInt(y) === selectedYear && selectedMonths.includes(parseInt(m));
      } catch (e) {
        return false;
      }
    });
  };

  const handleFilterApply = () => {
    localStorage.setItem('reportFilterEnabled', filterEnabled.toString());
    localStorage.setItem('reportSelectedYear', selectedYear.toString());
    localStorage.setItem('reportSelectedMonths', JSON.stringify(selectedMonths));
    setShowFilterModal(false);
    loadReports();
  };

  const handleNoFilter = () => {
    setFilterEnabled(false);
    localStorage.setItem('reportFilterEnabled', 'false');
    setShowFilterModal(false);
    loadReports();
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
  const [filterEnabled, setFilterEnabled] = useState(() => {
    return localStorage.getItem('reportFilterEnabled') === 'true';
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return parseInt(localStorage.getItem('reportSelectedYear') || new Date().getFullYear().toString());
  });
  const [selectedMonths, setSelectedMonths] = useState<number[]>(() => {
    const saved = localStorage.getItem('reportSelectedMonths');
    return saved ? JSON.parse(saved) : [new Date().getMonth() + 1];
  });
  const [showFilterModal, setShowFilterModal] = useState(false);

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
  }, [verticalFilter, filterEnabled, selectedYear, selectedMonths]);

  const loadReports = async () => {
    try {
      setLoading(true);
      let vertical = verticalFilter;
      if (verticalFilter === 'general') {
        vertical = 'general';
      }
      const params = `?vertical=${vertical}&_t=${Date.now()}`;
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

  if (!reportData || !reportData.renewalPerformance) {
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

      {/* Filter Bar */}
      <div className="sticky top-0 bg-slate-900/80  z-10 pb-4 pt-2 border border-slate-700/50 rounded-xl mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-300 font-medium">Report Filter:</label>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              filterEnabled 
                ? 'bg-indigo-500/20 text-indigo-300' 
                : 'bg-slate-600/30 text-slate-400'
            }`}>
              {filterEnabled ? `${selectedMonths.length} month(s) - ${selectedYear}` : 'No Filter'}
            </span>
          </div>
          <Button onClick={() => setShowFilterModal(true)} size="sm">⚙️ Configure</Button>
        </div>
      </div>

      {/* Filter Modal */}
      <Modal open={showFilterModal} onClose={() => setShowFilterModal(false)} title="Configure Report Filter">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Filter Status</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterEnabled(true)}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all ${
                  filterEnabled
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                With Filter
              </button>
              <button
                onClick={() => setFilterEnabled(false)}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all ${
                  !filterEnabled
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                No Filter
              </button>
            </div>
          </div>

          {filterEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded bg-slate-700 text-white text-sm"
                >
                  {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Months</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const monthNum = idx + 1;
                        setSelectedMonths(prev =>
                          prev.includes(monthNum)
                            ? prev.filter(m => m !== monthNum)
                            : [...prev, monthNum].sort((a, b) => a - b)
                        );
                      }}
                      className={`px-2 py-2 rounded text-xs font-medium transition-all ${
                        selectedMonths.includes(idx + 1)
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleNoFilter}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all"
            >
              Clear Filter
            </button>
            <button
              onClick={handleFilterApply}
              className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </Modal>

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
      {activeTab === 'renewal' && (() => {
        const filtered = applyMonthFilter(reportData.renewalPerformance.customers);
        const renewed = filtered.filter(c => c.status?.toLowerCase().trim() === 'renewed').length;
        const inProcess = filtered.filter(c => { const s = c.status?.toLowerCase().trim().replace(/[\s-]/g, ''); return s === 'inprocess' || s === 'inprogress'; }).length;
        const lost = filtered.filter(c => c.status?.toLowerCase().trim() === 'not renewed').length;
        const isExpired = (d) => { if (!d) return false; try { const [dy, dm, dd] = d.split('/'); const date = new Date(parseInt(dd), parseInt(dm) - 1, parseInt(dy)); const today = new Date(); today.setHours(0, 0, 0, 0); return date < today; } catch (e) { return false; } };
        const upcoming = filtered.filter(c => c.status?.toLowerCase().trim() === 'due' && !isExpired(c.renewal_date || c.od_expiry_date)).length;
        const expired = filtered.filter(c => c.status?.toLowerCase().trim() === 'due' && isExpired(c.renewal_date || c.od_expiry_date)).length;
        const conversionRate = filtered.length > 0 ? Math.round((renewed / filtered.length) * 100) : 0;
        const filteredTrend = reportData.renewalPerformance.monthlyTrend.map(m => ({
          month: m.month,
          renewed: filterEnabled ? Math.round(m.renewed * (filtered.length / (reportData.renewalPerformance.customers.length || 1))) : m.renewed,
          expired: filterEnabled ? Math.round(m.expired * (filtered.length / (reportData.renewalPerformance.customers.length || 1))) : m.expired,
          lost: filterEnabled ? Math.round(m.lost * (filtered.length / (reportData.renewalPerformance.customers.length || 1))) : m.lost
        }));
        return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Total Policies'); setDetailsModalCustomers(sortCustomersByExpiry(filtered)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Total Policies</span><span className="md:hidden">Total</span></h4>
              <p className="text-xl font-semibold text-blue-400">{filtered.length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Renewed So Far'); setDetailsModalCustomers(sortCustomersByExpiry(filtered.filter(c => c.status?.toLowerCase().trim() === 'renewed'))); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Renewed So Far</span><span className="md:hidden">Renewed</span></h4>
              <p className="text-xl font-semibold text-green-400">{renewed}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('In Process'); setDetailsModalCustomers(sortCustomersByExpiry(filtered.filter(c => { const s = c.status?.toLowerCase().trim().replace(/[\s-]/g, ''); return s === 'inprocess' || s === 'inprogress'; }))); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">In Process</span><span className="md:hidden">Process</span></h4>
              <p className="text-xl font-semibold text-blue-400">{inProcess}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Lost Customers'); setDetailsModalCustomers(sortCustomersByExpiry(filtered.filter(c => c.status?.toLowerCase().trim() === 'not renewed'))); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Lost</span><span className="md:hidden">Lost</span></h4>
              <p className="text-xl font-semibold text-red-400">{lost}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Upcoming Renewals'); setDetailsModalCustomers(sortCustomersByExpiry(filtered.filter(c => c.status?.toLowerCase().trim() === 'due' && !isExpired(c.renewal_date || c.od_expiry_date)))); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Upcoming Renewals</span><span className="md:hidden">Upcoming</span></h4>
              <p className="text-xl font-semibold text-yellow-400">{upcoming}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Expired Policies'); setDetailsModalCustomers(sortCustomersByExpiry(filtered.filter(c => c.status?.toLowerCase().trim() === 'due' && isExpired(c.renewal_date || c.od_expiry_date)))); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Expired Policies</span><span className="md:hidden">Expired</span></h4>
              <p className="text-xl font-semibold text-red-400">{expired}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('All Renewals'); setDetailsModalCustomers(sortCustomersByExpiry(filtered)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Conversion Rate</span><span className="md:hidden">Conv %</span></h4>
              <p className="text-xl font-semibold text-cyan-400">{conversionRate}%</p>
            </div>
          </div>

          <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Renewal Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={filteredTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Legend />
                <Bar dataKey="renewed" fill="#22c55e" name="Renewed" />
                <Bar dataKey="expired" fill="#ef4444" name="Expired" />
                <Bar dataKey="lost" fill="#f97316" name="Lost" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl overflow-hidden">
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
                {filtered.map((customer, idx) => (
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
        );
      })()}

      {/* Premium Collection Report */}
      {activeTab === 'premium' && (() => {
        const filtered = applyMonthFilter(reportData.premiumCollection.customers);
        const now = new Date();
        const collectedThisMonth = reportData.premiumCollection.customers.filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); if (status !== 'renewed' && status !== 'inprocess' && status !== 'inprogress') return false; const dateStr = c.renewal_date || c.od_expiry_date; if (!dateStr) return false; try { const [d, m, y] = dateStr.split('/'); const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); } catch (e) { return false; } }).reduce((sum, c) => sum + (parseFloat(c.premium) || 0), 0);
        const collectedThisYear = reportData.premiumCollection.customers.filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); if (status !== 'renewed' && status !== 'inprocess' && status !== 'inprogress') return false; const dateStr = c.renewal_date || c.od_expiry_date; if (!dateStr) return false; try { const [d, m, y] = dateStr.split('/'); const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); return date.getFullYear() === now.getFullYear(); } catch (e) { return false; } }).reduce((sum, c) => sum + (parseFloat(c.premium) || 0), 0);
        const topCustomer = [...reportData.premiumCollection.customers.filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); return status === 'renewed' || status === 'inprocess' || status === 'inprogress'; })].sort((a, b) => (parseFloat(b.premium) || 0) - (parseFloat(a.premium) || 0))[0] || { name: 'N/A', premium: 0 };
        const companyTotals = {};
        reportData.premiumCollection.customers.filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); return status === 'renewed' || status === 'inprocess' || status === 'inprogress'; }).forEach(c => { const co = c.company || 'Unknown'; companyTotals[co] = (companyTotals[co] || 0) + (parseFloat(c.premium) || 0); });
        const topCompany = Object.entries(companyTotals).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
        const byCompanyFiltered = Object.entries(companyTotals).map(([company, amount]) => ({ company, amount })).sort((a, b) => b.amount - a.amount);
        const statusFilteredForCompany = reportData.premiumCollection.customers.filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); return status === 'renewed' || status === 'inprocess' || status === 'inprogress'; });
        const filteredMonthlyPremium = reportData.premiumCollection.monthlyPremium.map(m => ({
          month: m.month,
          amount: filterEnabled ? Math.round(m.amount * (filtered.length / (reportData.premiumCollection.customers.length || 1))) : m.amount
        }));
        return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Premium Collection - This Month'); setDetailsModalCustomers(sortCustomersByExpiry(filtered)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Collected This Month</span><span className="md:hidden">Month</span></h4>
              <p className="text-xl font-semibold text-green-400">₹{collectedThisMonth}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Premium Collection - This Year'); setDetailsModalCustomers(sortCustomersByExpiry(reportData.premiumCollection.customers.filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); if (status !== 'renewed' && status !== 'inprocess' && status !== 'inprogress') return false; const dateStr = c.renewal_date || c.od_expiry_date; if (!dateStr) return false; try { const [d, m, y] = dateStr.split('/'); const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); return date.getFullYear() === now.getFullYear(); } catch (e) { return false; } }))); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Collected This Year</span><span className="md:hidden">Year</span></h4>
              <p className="text-xl font-semibold text-cyan-400">₹{collectedThisYear}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const tc = statusFilteredForCompany.filter(c => c.name === topCustomer.name); setDetailsModalTitle('Highest Premium Customer'); setDetailsModalCustomers(sortCustomersByExpiry(tc)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Highest Premium Customer</span><span className="md:hidden">Top Cust</span></h4>
              <p className="text-base font-semibold text-purple-400 truncate">{topCustomer.name}</p>
              <p className="text-xs text-slate-400">₹{topCustomer.premium || 0}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const tc = statusFilteredForCompany.filter(c => c.company === topCompany[0]); setDetailsModalTitle(`${topCompany[0]} - Customers`); setDetailsModalCustomers(sortCustomersByExpiry(tc)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Top Insurance Company</span><span className="md:hidden">Top Co</span></h4>
              <p className="text-base font-semibold text-orange-400 truncate">{topCompany[0]}</p>
              <p className="text-xs text-slate-400">₹{topCompany[1]}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Month-wise Premium Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={filteredMonthlyPremium}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                  <Line type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={2} name="Premium" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Premium Distribution by Company</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={byCompanyFiltered} dataKey="amount" nameKey="company" cx="50%" cy="50%" outerRadius={80} label>
                    {byCompanyFiltered.map((_, idx) => (
                      <Cell key={idx} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][idx % 6]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl overflow-hidden">
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
                {statusFilteredForCompany.map((customer, idx) => (
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
        );
      })()}

      {/* Customer Growth Report */}
      {activeTab === 'growth' && (() => {
        const filtered = applyMonthFilter(reportData.customerGrowth.customers);
        const renewed = filtered.filter(c => c.status?.toLowerCase().trim() === 'renewed').length;
        const notRenewed = filtered.filter(c => c.status?.toLowerCase().trim() === 'not renewed').length;
        const due = filtered.filter(c => c.status?.toLowerCase().trim() === 'due').length;
        const retentionRate = filtered.length > 0 ? Math.round((renewed / filtered.length) * 100) : 0;
        const filteredGrowthTrend = reportData.customerGrowth.growthTrend.map(m => ({
          month: m.month,
          count: filterEnabled ? Math.round(m.count * (filtered.length / (reportData.customerGrowth.customers.length || 1))) : m.count
        }));
        return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Total Customers'); setDetailsModalCustomers(sortCustomersByExpiry(filtered)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Total Customers</span><span className="md:hidden">Total</span></h4>
              <p className="text-xl font-semibold text-blue-400">{filtered.length}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const r = sortCustomersByExpiry(filtered.filter(c => c.status?.toLowerCase().trim() === 'renewed')); setDetailsModalTitle('Renewed Customers'); setDetailsModalCustomers(r); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Renewed</span><span className="md:hidden">Renewed</span></h4>
              <p className="text-xl font-semibold text-green-400">{renewed}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const nr = sortCustomersByExpiry(filtered.filter(c => c.status?.toLowerCase().trim() === 'not renewed')); setDetailsModalTitle('Not Renewed (Lost)'); setDetailsModalCustomers(nr); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Not Renewed</span><span className="md:hidden">Lost</span></h4>
              <p className="text-xl font-semibold text-red-400">{notRenewed}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const d = sortCustomersByExpiry(filtered.filter(c => c.status?.toLowerCase().trim() === 'due')); setDetailsModalTitle('Due Customers'); setDetailsModalCustomers(d); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Due</span><span className="md:hidden">Due</span></h4>
              <p className="text-xl font-semibold text-yellow-400">{due}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('All Customers'); setDetailsModalCustomers(sortCustomersByExpiry(filtered)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Retention Rate</span><span className="md:hidden">Retain %</span></h4>
              <p className="text-xl font-semibold text-purple-400">{retentionRate}%</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('All Customers'); setDetailsModalCustomers(sortCustomersByExpiry(filtered)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Growth Trend</span><span className="md:hidden">Trend</span></h4>
              <p className="text-xl font-semibold text-cyan-400">{filtered.length}</p>
            </div>
          </div>

          <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Customer Growth Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredGrowthTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} name="Total Customers" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl overflow-hidden">
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
                {filtered.map((customer, idx) => (
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
        );
      })()}

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
      {activeTab === 'claims' && (() => {
        const filteredClaims = applyMonthFilter(reportData.claimsSummary.claims);
        const totalFiled = filteredClaims.length;
        const approved = filteredClaims.filter(c => c.claim_status === 'approved' || c.claim_status === 'settled').length;
        const rejected = filteredClaims.filter(c => c.claim_status === 'rejected').length;
        const inProgress = filteredClaims.filter(c => c.claim_status === 'in_progress' || c.claim_status === 'filed' || c.claim_status === 'survey_done').length;
        const byInsurerFiltered = {};
        filteredClaims.forEach(c => { const co = c.insurance_company || 'Unknown'; if (!byInsurerFiltered[co]) byInsurerFiltered[co] = { company: co, count: 0 }; byInsurerFiltered[co].count++; });
        const byTypeFiltered = {};
        filteredClaims.forEach(c => { const t = c.claim_type || 'unknown'; if (!byTypeFiltered[t]) byTypeFiltered[t] = { type: t, count: 0 }; byTypeFiltered[t].count++; });
        return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('All Filed Claims'); setDetailsModalCustomers(sortCustomersByExpiry(filteredClaims)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Total Filed</span><span className="md:hidden">Filed</span></h4>
              <p className="text-xl font-semibold text-blue-400">{totalFiled}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const a = sortCustomersByExpiry(filteredClaims.filter(c => c.claim_status === 'approved' || c.claim_status === 'settled')); setDetailsModalTitle('Approved/Settled Claims'); setDetailsModalCustomers(a); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Approved</span><span className="md:hidden">Appr</span></h4>
              <p className="text-xl font-semibold text-green-400">{approved}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const r = sortCustomersByExpiry(filteredClaims.filter(c => c.claim_status === 'rejected')); setDetailsModalTitle('Rejected Claims'); setDetailsModalCustomers(r); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Rejected</span><span className="md:hidden">Rej</span></h4>
              <p className="text-xl font-semibold text-red-400">{rejected}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { const ip = sortCustomersByExpiry(filteredClaims.filter(c => c.claim_status === 'in_progress' || c.claim_status === 'filed' || c.claim_status === 'survey_done')); setDetailsModalTitle('Claims In Progress'); setDetailsModalCustomers(ip); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">In Progress</span><span className="md:hidden">Prog</span></h4>
              <p className="text-xl font-semibold text-orange-400">{inProgress}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('All Claims'); setDetailsModalCustomers(sortCustomersByExpiry(filteredClaims)); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Avg Settlement Time</span><span className="md:hidden">Avg Days</span></h4>
              <p className="text-xl font-semibold text-purple-400">0 days</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Claims Distribution by Insurer</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={Object.values(byInsurerFiltered)} dataKey="count" nameKey="company" cx="50%" cy="50%" outerRadius={80} label>
                    {Object.values(byInsurerFiltered).map((_, idx) => (
                      <Cell key={idx} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][idx % 5]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Claims Distribution by Type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={Object.values(byTypeFiltered)} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label={({ type }) => getClaimTypeLabel(type)}>
                    {Object.values(byTypeFiltered).map((_, idx) => (
                      <Cell key={idx} fill={['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'][idx % 7]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800/50  border border-slate-700/50 rounded-xl overflow-hidden">
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
                {filteredClaims.map((claim, idx) => (
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
        );
      })()}
    </div>
  );
}
