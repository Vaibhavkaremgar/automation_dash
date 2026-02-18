import React, { useRef } from 'react';
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
  dob?: string;
  pancard?: string;
}

interface CustomerTableProps {
  customers: Customer[];
  isMotor: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (id: number) => void;
  getDisplayDate: (customer: Customer) => string;
  isAdmin?: boolean;
}

export default function CustomerTable({ customers, isMotor, onEdit, onDelete, getDisplayDate, isAdmin = false }: CustomerTableProps) {
  const tableScrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={tableScrollRef} className="bg-slate-800 border border-slate-700 rounded-lg overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">DOB</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">G Code</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Mobile No</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">PAN Number</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {customers.map((customer) => (
            <tr key={customer.id} className="bg-slate-800">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{customer.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{customer.dob || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400 font-medium">{customer.g_code || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{customer.mobile_number}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{customer.pancard || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(customer)}>Edit</Button>
                {isAdmin && <Button size="sm" variant="outline" onClick={() => onDelete(customer.id)}>Delete</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
