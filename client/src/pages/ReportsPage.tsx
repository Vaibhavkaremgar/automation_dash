import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { api } from '../lib/api';

interface ReportData {
  renewalPerformance: {
    expiringThisMonth: number;
    renewedSoFar: number;
    pendingRenewals: number;
    expiredWithoutRenewal: number;
    conversionRate: number;
    monthlyTrend: Array<{ month: string; count: number }>;
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
  const [verticalFilter, setVerticalFilter] = useState(() => {
    return localStorage.getItem('insuranceVertical') || 'motor';
  });
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState('renewal');

  useEffect(() => {
    loadReports();
    localStorage.setItem('insuranceVertical', verticalFilter);
    
    const handleVerticalChange = (e: any) => {
      setVerticalFilter(e.detail);
      localStorage.setItem('insuranceVertical', e.detail);
    };
    
    window.addEventListener('insuranceVerticalChange', handleVerticalChange);
    return () => window.removeEventListener('insuranceVerticalChange', handleVerticalChange);
  }, [verticalFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const verticalParam = `?vertical=${verticalFilter}`;
      console.log('Loading reports from:', `/api/insurance/reports${verticalParam}`);
      const response = await api.get(`/api/insurance/reports${verticalParam}`);
      console.log('Reports loaded successfully:', response.data);
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
      console.error('Error details:', error.response?.data || error.message);
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Expiring This Month</span><span className="md:hidden">Expiring</span></h4>
              <p className="text-2xl font-bold text-orange-400">{reportData.renewalPerformance.expiringThisMonth}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Renewed So Far</span><span className="md:hidden">Renewed</span></h4>
              <p className="text-2xl font-bold text-green-400">{reportData.renewalPerformance.renewedSoFar}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Pending Renewals</span><span className="md:hidden">Pending</span></h4>
              <p className="text-2xl font-bold text-yellow-400">{reportData.renewalPerformance.pendingRenewals}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Expired Without Renewal</span><span className="md:hidden">Expired</span></h4>
              <p className="text-2xl font-bold text-red-400">{reportData.renewalPerformance.expiredWithoutRenewal}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Conversion Rate</span><span className="md:hidden">Conv %</span></h4>
              <p className="text-2xl font-bold text-cyan-400">{reportData.renewalPerformance.conversionRate}%</p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Renewal Trend (Last 12 Months)</h3>
            <div className="flex items-end gap-2 h-48 overflow-x-auto">
              {reportData.renewalPerformance.monthlyTrend.map((item, idx) => (
                <div key={idx} className="flex-1 min-w-[60px] flex flex-col items-center">
                  <div className="w-full bg-indigo-500/30 rounded-t" style={{ height: `${(item.count / Math.max(...reportData.renewalPerformance.monthlyTrend.map(t => t.count))) * 100}%` }}>
                    <div className="text-center text-white text-xs pt-1">{item.count}</div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Customer</span><span className="md:hidden">Cust</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Vehicle</span><span className="md:hidden">Veh</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Renewal Date</span><span className="md:hidden">Renew</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Premium</span><span className="md:hidden">Amt</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Status</span><span className="md:hidden">Sts</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {reportData.renewalPerformance.customers.map((customer, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 text-sm text-white">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.registration_no}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.renewal_date}</td>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Collected This Month</span><span className="md:hidden">Month</span></h4>
              <p className="text-2xl font-bold text-green-400">₹{reportData.premiumCollection.collectedThisMonth}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Collected This Year</span><span className="md:hidden">Year</span></h4>
              <p className="text-2xl font-bold text-cyan-400">₹{reportData.premiumCollection.collectedThisYear}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Highest Premium Customer</span><span className="md:hidden">Top Cust</span></h4>
              <p className="text-lg font-bold text-purple-400">{reportData.premiumCollection.highestCustomer.name}</p>
              <p className="text-sm text-slate-300">₹{reportData.premiumCollection.highestCustomer.premium}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Top Insurance Company</span><span className="md:hidden">Top Co</span></h4>
              <p className="text-lg font-bold text-orange-400">{reportData.premiumCollection.highestCompany.name}</p>
              <p className="text-sm text-slate-300">₹{reportData.premiumCollection.highestCompany.premium}</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Premium</span><span className="md:hidden">Amt</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Renewal Date</span><span className="md:hidden">Renew</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase"><span className="hidden md:inline">Status</span><span className="md:hidden">Sts</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {reportData.premiumCollection.customers.map((customer, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 text-sm text-white">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.company}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">₹{customer.premium}</td>
                    <td className="px-6 py-4 text-sm text-slate-100">{customer.renewal_date}</td>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">New This Month</span><span className="md:hidden">New</span></h4>
              <p className="text-2xl font-bold text-green-400">{reportData.customerGrowth.newThisMonth}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Total Active</span><span className="md:hidden">Active</span></h4>
              <p className="text-2xl font-bold text-cyan-400">{reportData.customerGrowth.totalActive}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Total Inactive</span><span className="md:hidden">Inactive</span></h4>
              <p className="text-2xl font-bold text-red-400">{reportData.customerGrowth.totalInactive}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Retention Rate</span><span className="md:hidden">Retain %</span></h4>
              <p className="text-2xl font-bold text-purple-400">{reportData.customerGrowth.retentionRate}%</p>
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

      {/* Claims Summary Report */}
      {activeTab === 'claims' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Total Filed</span><span className="md:hidden">Filed</span></h4>
              <p className="text-2xl font-bold text-blue-400">{reportData.claimsSummary.totalFiled}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Approved</span><span className="md:hidden">Appr</span></h4>
              <p className="text-2xl font-bold text-green-400">{reportData.claimsSummary.approved}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Rejected</span><span className="md:hidden">Rej</span></h4>
              <p className="text-2xl font-bold text-red-400">{reportData.claimsSummary.rejected}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">In Progress</span><span className="md:hidden">Prog</span></h4>
              <p className="text-2xl font-bold text-orange-400">{reportData.claimsSummary.inProgress}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2"><span className="hidden md:inline">Avg Settlement Time</span><span className="md:hidden">Avg Days</span></h4>
              <p className="text-2xl font-bold text-purple-400">{reportData.claimsSummary.avgSettlementDays} days</p>
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
                      <span className="text-slate-300">{item.type}</span>
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
                    <td className="px-6 py-4 text-sm text-slate-100">{claim.claim_type}</td>
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
