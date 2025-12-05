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
      const response = await api.get(`/api/insurance/reports${verticalParam}`);
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
    return <div className="p-6 text-white">Failed to load reports</div>;
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
      <div className="flex gap-2 border-b border-slate-700">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'renewal' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}
          onClick={() => setActiveTab('renewal')}
        >
          Renewal Performance
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'premium' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}
          onClick={() => setActiveTab('premium')}
        >
          Premium Collection
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'growth' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}
          onClick={() => setActiveTab('growth')}
        >
          Customer Growth
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'claims' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}
          onClick={() => setActiveTab('claims')}
        >
          Claims Summary
        </button>
      </div>

      {/* Renewal Performance Report */}
      {activeTab === 'renewal' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Expiring This Month</h4>
              <p className="text-2xl font-bold text-orange-400">{reportData.renewalPerformance.expiringThisMonth}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Renewed So Far</h4>
              <p className="text-2xl font-bold text-green-400">{reportData.renewalPerformance.renewedSoFar}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Pending Renewals</h4>
              <p className="text-2xl font-bold text-yellow-400">{reportData.renewalPerformance.pendingRenewals}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Expired Without Renewal</h4>
              <p className="text-2xl font-bold text-red-400">{reportData.renewalPerformance.expiredWithoutRenewal}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Conversion Rate</h4>
              <p className="text-2xl font-bold text-cyan-400">{reportData.renewalPerformance.conversionRate}%</p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Renewal Trend (Last 6 Months)</h3>
            <div className="flex items-end gap-4 h-48">
              {reportData.renewalPerformance.monthlyTrend.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-indigo-500/30 rounded-t" style={{ height: `${(item.count / Math.max(...reportData.renewalPerformance.monthlyTrend.map(t => t.count))) * 100}%` }}>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Renewal Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Premium</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Status</th>
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
              <h4 className="text-sm text-slate-300 mb-2">Collected This Month</h4>
              <p className="text-2xl font-bold text-green-400">₹{reportData.premiumCollection.collectedThisMonth}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Collected This Year</h4>
              <p className="text-2xl font-bold text-cyan-400">₹{reportData.premiumCollection.collectedThisYear}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Highest Premium Customer</h4>
              <p className="text-lg font-bold text-purple-400">{reportData.premiumCollection.highestCustomer.name}</p>
              <p className="text-sm text-slate-300">₹{reportData.premiumCollection.highestCustomer.premium}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Top Insurance Company</h4>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Premium</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Renewal Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Status</th>
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
              <h4 className="text-sm text-slate-300 mb-2">New This Month</h4>
              <p className="text-2xl font-bold text-green-400">{reportData.customerGrowth.newThisMonth}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Total Active</h4>
              <p className="text-2xl font-bold text-cyan-400">{reportData.customerGrowth.totalActive}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Total Inactive</h4>
              <p className="text-2xl font-bold text-red-400">{reportData.customerGrowth.totalInactive}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Retention Rate</h4>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Customer Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Added Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Status</th>
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
              <h4 className="text-sm text-slate-300 mb-2">Total Filed</h4>
              <p className="text-2xl font-bold text-blue-400">{reportData.claimsSummary.totalFiled}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Approved</h4>
              <p className="text-2xl font-bold text-green-400">{reportData.claimsSummary.approved}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Rejected</h4>
              <p className="text-2xl font-bold text-red-400">{reportData.claimsSummary.rejected}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">In Progress</h4>
              <p className="text-2xl font-bold text-orange-400">{reportData.claimsSummary.inProgress}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm text-slate-300 mb-2">Avg Settlement Time</h4>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Filed Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Updated Date</th>
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
