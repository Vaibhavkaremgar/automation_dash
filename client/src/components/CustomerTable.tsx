import React, { useRef, useEffect } from 'react';
import { Button } from './ui/Button';

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
  g_code?: string;
}

interface CustomerTableProps {
  customers: Customer[];
  isMotor: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (id: number) => void;
  getDisplayDate: (customer: Customer) => string;
}

export default function CustomerTable({ customers, isMotor, onEdit, onDelete, getDisplayDate }: CustomerTableProps) {
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tableScroll = tableScrollRef.current;
    const topScroll = topScrollRef.current;
    
    if (!tableScroll || !topScroll) return;

    const syncScroll = (source: HTMLDivElement, target: HTMLDivElement) => {
      target.scrollLeft = source.scrollLeft;
    };

    const handleTableScroll = () => syncScroll(tableScroll, topScroll);
    const handleTopScroll = () => syncScroll(topScroll, tableScroll);

    tableScroll.addEventListener('scroll', handleTableScroll);
    topScroll.addEventListener('scroll', handleTopScroll);

    // Set initial width
    if (topScroll.firstChild) {
      (topScroll.firstChild as HTMLElement).style.width = `${tableScroll.scrollWidth}px`;
    }

    return () => {
      tableScroll.removeEventListener('scroll', handleTableScroll);
      topScroll.removeEventListener('scroll', handleTopScroll);
    };
  }, [customers]);

  return (
    <>
      {/* Sticky horizontal scrollbar */}
      <div className="sticky top-20 z-10 bg-slate-900/80 backdrop-blur-md rounded-lg mb-2">
        <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden h-3">
          <div style={{ height: '1px' }} />
        </div>
      </div>

      {/* Table */}
      <div ref={tableScrollRef} className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider w-32">
                <span className="hidden md:inline">Name</span>
                <span className="md:hidden">Name</span>
              </th>
              {isMotor && (
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">
                  <span className="hidden md:inline">G Code</span>
                  <span className="md:hidden">G</span>
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">
                <span className="hidden md:inline">Mobile</span>
                <span className="md:hidden">Mob</span>
              </th>
              {isMotor && (
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">
                  <span className="hidden md:inline">Vehicle</span>
                  <span className="md:hidden">Veh</span>
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">
                <span className="hidden md:inline">Renewal Date</span>
                <span className="md:hidden">Renew</span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">
                <span className="hidden md:inline">Premium</span>
                <span className="md:hidden">Amt</span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">
                <span className="hidden md:inline">Status</span>
                <span className="md:hidden">Sts</span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase tracking-wider">
                <span className="hidden md:inline">Actions</span>
                <span className="md:hidden">Act</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-slate-700/30">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {customer.name}
                </td>
                {isMotor && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400 font-medium">
                    {customer.g_code || '-'}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                  {customer.mobile_number}
                </td>
                {isMotor && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                    {customer.registration_no}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                  {getDisplayDate(customer)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                  ₹{customer.premium}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      customer.status === 'active'
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : customer.status === 'paid'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-500/20 text-slate-200 border border-slate-500/30'
                    }`}
                  >
                    {customer.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(customer)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDelete(customer.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
