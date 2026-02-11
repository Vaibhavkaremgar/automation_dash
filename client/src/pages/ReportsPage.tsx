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
      <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md z-10 pb-4 pt-2 border border-slate-700/50 rounded-xl mb-4">
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

      {/* Premium Collection Report */}
      {activeTab === 'premium' && (() => {
        const now = new Date();
        const statusFilteredForCompany = reportData.premiumCollection.customers.filter(c => { const status = c.status.trim().toLowerCase().replace(/[\s-]/g, ''); return status === 'renewed' || status === 'inprocess' || status === 'inprogress'; });
        const collectedThisMonth = statusFilteredForCompany.filter(c => { const dateStr = c.renewal_date || c.od_expiry_date; if (!dateStr) return false; try { const [d, m, y] = dateStr.split('/'); const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); } catch (e) { return false; } }).reduce((sum, c) => sum + (parseFloat(c.premium) || 0), 0);
        const collectedThisYear = statusFilteredForCompany.filter(c => { const dateStr = c.renewal_date || c.od_expiry_date; if (!dateStr) return false; try { const [d, m, y] = dateStr.split('/'); const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); return date.getFullYear() === now.getFullYear(); } catch (e) { return false; } }).reduce((sum, c) => sum + (parseFloat(c.premium) || 0), 0);
        const topCustomer = [...statusFilteredForCompany].sort((a, b) => (parseFloat(b.premium) || 0) - (parseFloat(a.premium) || 0))[0] || { name: 'N/A', premium: 0 };
        const companyTotals = {};
        statusFilteredForCompany.forEach(c => { const co = c.company || 'Unknown'; companyTotals[co] = (companyTotals[co] || 0) + (parseFloat(c.premium) || 0); });
        const topCompany = Object.entries(companyTotals).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
        const byCompanyFiltered = Object.entries(companyTotals).map(([company, amount]) => ({ company, amount })).sort((a, b) => b.amount - a.amount);
        const filteredMonthlyPremium = reportData.premiumCollection.monthlyPremium;
        return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Premium Collection - This Month'); setDetailsModalCustomers(sortCustomersByExpiry(statusFilteredForCompany.filter(c => { const dateStr = c.renewal_date || c.od_expiry_date; if (!dateStr) return false; try { const [d, m, y] = dateStr.split('/'); const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); } catch (e) { return false; } }))); setShowDetailsModal(true); }}>
              <h4 className="text-xs text-slate-400 mb-1"><span className="hidden md:inline">Collected This Month</span><span className="md:hidden">Month</span></h4>
              <p className="text-xl font-semibold text-green-400">₹{collectedThisMonth}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/70 transition-all" onClick={() => { setDetailsModalTitle('Premium Collection - This Year'); setDetailsModalCustomers(sortCustomersByExpiry(statusFilteredForCompany.filter(c => { const dateStr = c.renewal_date || c.od_expiry_date; if (!dateStr) return false; try { const [d, m, y] = dateStr.split('/'); const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)); return date.getFullYear() === now.getFullYear(); } catch (e) { return false; } }))); setShowDetailsModal(true); }}>
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
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
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

            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
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
              (c.registration_no?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || '')
            ).length === 0 ? (
              <p className="text-center text-slate-400 py-8">No data found</p>
            ) : (
              detailsModalCustomers.filter(c => 
                (c.name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || '') ||
                (c.mobile_number?.includes(modalSearchTerm) || '') ||
                (c.registration_no?.toLowerCase().includes(modalSearchTerm.toLowerCase()) || '')
              ).map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                  <h4 className="font-bold text-white">{item.name}</h4>
                  <p className="text-xs text-slate-400">₹{item.premium}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
