import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { api } from '../lib/api';

interface Customer {
  id: number;
  name: string;
  mobile_number: string;
}

interface Claim {
  id: number;
  customer_id: number;
  customer_name: string;
  mobile_number: string;
  policy_number: string;
  insurance_company: string;
  vehicle_number: string;
  claim_type: string;
  incident_date: string;
  description: string;
  claim_status: string;
  claim_amount: number;
  created_at: string;
}

export default function ClaimsManagement() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const [newClaim, setNewClaim] = useState({
    customer_id: '',
    policy_number: '',
    insurance_company: '',
    vehicle_number: '',
    claim_type: 'own_damage',
    incident_date: '',
    description: '',
    claim_amount: ''
  });

  const [statusUpdate, setStatusUpdate] = useState({
    claim_status: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [claimsRes, customersRes] = await Promise.all([
        api.get('/api/insurance/claims'),
        api.get('/api/insurance/customers')
      ]);
      setClaims(claimsRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClaim = async () => {
    try {
      await api.post('/api/insurance/claims', {
        ...newClaim,
        customer_id: parseInt(newClaim.customer_id),
        claim_amount: parseFloat(newClaim.claim_amount) || 0
      });
      setShowAddModal(false);
      setNewClaim({
        customer_id: '',
        policy_number: '',
        insurance_company: '',
        vehicle_number: '',
        claim_type: 'own_damage',
        incident_date: '',
        description: '',
        claim_amount: ''
      });
      loadData();
    } catch (error) {
      console.error('Failed to add claim:', error);
      alert('Failed to add claim');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedClaim) return;
    
    try {
      await api.patch(`/api/insurance/claims/${selectedClaim.id}/status`, statusUpdate);
      
      // Send notification
      await api.post(`/api/insurance/claims/${selectedClaim.id}/notify`, {
        channel: 'whatsapp'
      });
      
      setShowStatusModal(false);
      setSelectedClaim(null);
      setStatusUpdate({ claim_status: '', notes: '' });
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDeleteClaim = async (id: number) => {
    if (!confirm('Are you sure you want to delete this claim?')) return;
    
    try {
      await api.delete(`/api/insurance/claims/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete claim:', error);
    }
  };

  const handleNotify = async (claimId: number, channel: string) => {
    try {
      await api.post(`/api/insurance/claims/${claimId}/notify`, { channel });
      alert(`${channel} notification sent!`);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filed': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'survey_done': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'in_progress': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'approved': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'settled': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default: return 'bg-slate-500/20 text-slate-200 border-slate-500/30';
    }
  };

  const getClaimTypeLabel = (type: string) => {
    switch (type) {
      case 'own_damage': return 'Own Damage';
      case 'third_party': return 'Third Party';
      case 'theft': return 'Theft';
      case 'total_loss': return 'Total Loss';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
          Claims Management
        </h1>
        <Button onClick={() => setShowAddModal(true)}>Add Claim</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 text-center">
          <h4 className="font-medium text-blue-300 mb-2">Filed</h4>
          <p className="text-2xl font-bold text-white">{claims.filter(c => c.claim_status === 'filed').length}</p>
        </div>
        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 text-center">
          <h4 className="font-medium text-purple-300 mb-2">Survey Done</h4>
          <p className="text-2xl font-bold text-white">{claims.filter(c => c.claim_status === 'survey_done').length}</p>
        </div>
        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 text-center">
          <h4 className="font-medium text-orange-300 mb-2">In Progress</h4>
          <p className="text-2xl font-bold text-white">{claims.filter(c => c.claim_status === 'in_progress').length}</p>
        </div>
        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 text-center">
          <h4 className="font-medium text-green-300 mb-2">Approved</h4>
          <p className="text-2xl font-bold text-white">{claims.filter(c => c.claim_status === 'approved').length}</p>
        </div>
        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 text-center">
          <h4 className="font-medium text-red-300 mb-2">Rejected</h4>
          <p className="text-2xl font-bold text-white">{claims.filter(c => c.claim_status === 'rejected').length}</p>
        </div>
        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 text-center">
          <h4 className="font-medium text-cyan-300 mb-2">Settled</h4>
          <p className="text-2xl font-bold text-white">{claims.filter(c => c.claim_status === 'settled').length}</p>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Claim Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Submitted On</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-100 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{claim.customer_name}</div>
                    <div className="text-sm text-slate-300">{claim.mobile_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{claim.vehicle_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{claim.insurance_company}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{getClaimTypeLabel(claim.claim_type)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                    {new Date(claim.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(claim.claim_status)}`}>
                      {getStatusLabel(claim.claim_status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">₹{claim.claim_amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedClaim(claim);
                        setStatusUpdate({ claim_status: claim.claim_status, notes: '' });
                        setShowStatusModal(true);
                      }}
                    >
                      Update
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => alert('🔒 Premium Feature\n\nUpgrade to Voice Bot Premium to enable automated calling.\n\nContact support to upgrade.')}
                      className="opacity-60"
                      title="Premium Feature"
                    >
                      Call 🔒
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const message = `Hi ${claim.customer_name}, your claim for ${claim.vehicle_number} (${claim.insurance_company}) is currently ${getStatusLabel(claim.claim_status)}. We will keep you updated.`;
                        window.open(`https://wa.me/${claim.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`);
                      }}
                    >
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteClaim(claim.id)}
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

      {/* Add Claim Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Claim">
        <div className="space-y-4">
          <select
            className="w-full p-2 border rounded bg-slate-700 text-white"
            value={newClaim.customer_id}
            onChange={(e) => {
              const selectedCustomer = customers.find(c => c.id === parseInt(e.target.value));
              if (selectedCustomer) {
                setNewClaim({
                  ...newClaim,
                  customer_id: e.target.value,
                  vehicle_number: (selectedCustomer as any).registration_no || '',
                  insurance_company: (selectedCustomer as any).company || ''
                });
              } else {
                setNewClaim({...newClaim, customer_id: e.target.value});
              }
            }}
          >
            <option value="">Select Customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} - {c.mobile_number}</option>
            ))}
          </select>
          <Input
            placeholder="Policy Number"
            value={newClaim.policy_number}
            onChange={(e) => setNewClaim({...newClaim, policy_number: e.target.value})}
          />
          <Input
            placeholder="Insurance Company"
            value={newClaim.insurance_company}
            onChange={(e) => setNewClaim({...newClaim, insurance_company: e.target.value})}
          />
          <Input
            placeholder="Vehicle Number"
            value={newClaim.vehicle_number}
            onChange={(e) => setNewClaim({...newClaim, vehicle_number: e.target.value})}
          />
          <select
            className="w-full p-2 border rounded bg-slate-700 text-white"
            value={newClaim.claim_type}
            onChange={(e) => setNewClaim({...newClaim, claim_type: e.target.value})}
          >
            <option value="own_damage">Own Damage</option>
            <option value="third_party">Third Party</option>
            <option value="theft">Theft</option>
            <option value="total_loss">Total Loss</option>
          </select>
          <Input
            type="date"
            placeholder="Incident Date"
            value={newClaim.incident_date}
            onChange={(e) => setNewClaim({...newClaim, incident_date: e.target.value})}
          />
          <textarea
            className="w-full p-2 border rounded bg-slate-700 text-white"
            placeholder="Description"
            rows={3}
            value={newClaim.description}
            onChange={(e) => setNewClaim({...newClaim, description: e.target.value})}
          />
          <Input
            type="number"
            placeholder="Claim Amount"
            value={newClaim.claim_amount}
            onChange={(e) => setNewClaim({...newClaim, claim_amount: e.target.value})}
          />
          <div className="flex gap-3">
            <Button onClick={handleAddClaim}>Add Claim</Button>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal open={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Claim Status">
        {selectedClaim && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-white font-medium">{selectedClaim.customer_name}</p>
              <p className="text-slate-300 text-sm">{selectedClaim.vehicle_number}</p>
            </div>
            <select
              className="w-full p-2 border rounded bg-slate-700 text-white"
              value={statusUpdate.claim_status}
              onChange={(e) => setStatusUpdate({...statusUpdate, claim_status: e.target.value})}
            >
              <option value="filed">Filed</option>
              <option value="survey_done">Survey Done</option>
              <option value="in_progress">In Progress</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="settled">Settled</option>
            </select>
            <textarea
              className="w-full p-2 border rounded bg-slate-700 text-white"
              placeholder="Notes (optional)"
              rows={3}
              value={statusUpdate.notes}
              onChange={(e) => setStatusUpdate({...statusUpdate, notes: e.target.value})}
            />
            <div className="flex gap-3">
              <Button onClick={handleUpdateStatus}>Update & Notify</Button>
              <Button variant="outline" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
