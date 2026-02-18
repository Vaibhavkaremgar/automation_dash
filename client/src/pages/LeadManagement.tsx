import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import api from '../lib/api';

interface Lead {
  id: number;
  name: string;
  mobile_number: string;
  email: string;
  interested_in: string;
  policy_expiry_date: string;
  follow_up_date: string;
  lead_status: string;
  priority: string;
  notes: string;
  referral_by: string;
}

export default function LeadManagement() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    mobile_number: '',
    email: '',
    interested_in: '',
    policy_expiry_date: '',
    follow_up_date: '',
    lead_status: 'new',
    priority: 'warm',
    notes: '',
    referral_by: '',
    other_interest: ''
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/leads');
      setLeads(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {...formData};
      if (formData.interested_in === 'Others' && formData.other_interest) {
        submitData.interested_in = formData.other_interest;
      }
      delete submitData.other_interest;

      if (editingLead) {
        await api.put(`/api/leads/${editingLead.id}`, submitData);
      } else {
        await api.post('/api/leads', submitData);
      }
      await fetchLeads();
      await syncToSheet();
      closeModal();
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Failed to save lead');
    }
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Delete lead: ${lead.name}?`)) return;
    try {
      await api.delete(`/api/leads/${lead.id}`);
      await fetchLeads();
      await syncToSheet([lead]);
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const syncFromSheet = async () => {
    if (!confirm('This will replace all local data with sheet data. Continue?')) return;
    try {
      setSyncing(true);
      const response = await api.post('/api/leads/sync-from-sheet');
      await fetchLeads();
      alert(`Synced ${response.data.imported} leads from sheet`);
    } catch (error) {
      console.error('Error syncing from sheet:', error);
      alert('Failed to sync from sheet');
    } finally {
      setSyncing(false);
    }
  };

  const syncToSheet = async (deleted: Lead[] = []) => {
    try {
      setSyncing(true);
      const response = await api.post('/api/leads/sync-to-sheet', { deletedLeads: deleted });
      if (response.data.success) {
        alert(`Synced to sheet: ${response.data.updated} updated, ${response.data.added} added, ${response.data.deleted} deleted`);
      }
    } catch (error) {
      console.error('Error syncing to sheet:', error);
      alert('Failed to sync to sheet');
    } finally {
      setSyncing(false);
    }
  };

  const getSheetUrl = () => {
    const isKMG = user?.email?.toLowerCase().includes('kmg');
    const spreadsheetId = isKMG ? '1qV6K3t7zpQl2pild6q2i1iS6ga9Zd6QQgu3nvyIEmN0' : '1SJY8rPUbhr1NUhKELpuLPU9dhlhz86ZWQ0AI5s4dj40';
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`;
  };

  const openModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        name: lead.name,
        mobile_number: lead.mobile_number,
        email: lead.email || '',
        interested_in: lead.interested_in || '',
        policy_expiry_date: lead.policy_expiry_date || '',
        follow_up_date: lead.follow_up_date || '',
        lead_status: lead.lead_status,
        priority: lead.priority,
        notes: lead.notes || '',
        referral_by: lead.referral_by || '',
        other_interest: ''
      });
    } else {
      setEditingLead(null);
      setFormData({
        name: '',
        mobile_number: '',
        email: '',
        interested_in: '',
        policy_expiry_date: '',
        follow_up_date: '',
        lead_status: 'new',
        priority: 'warm',
        notes: '',
        referral_by: '',
        other_interest: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLead(null);
  };

  const filteredLeads = leads.filter(l =>
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.mobile_number?.includes(searchTerm) ||
    l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.interested_in?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Lead Management</h1>
        <div className="flex gap-3">
          <Button onClick={() => window.open(getSheetUrl(), '_blank')} variant="outline" size="sm">
            Open Sheet
          </Button>
          <Button onClick={syncFromSheet} disabled={syncing} variant="outline" size="sm">
            {syncing ? 'Syncing...' : 'Sync from Sheet'}
          </Button>
          <Button onClick={() => syncToSheet()} disabled={syncing} variant="outline" size="sm">
            {syncing ? 'Syncing...' : 'Sync to Sheet'}
          </Button>
          <Button onClick={() => openModal()}>Add Lead</Button>
        </div>
      </div>

      <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md z-10 pb-4 pt-2 border border-slate-700/50 rounded-xl">
        <Input
          placeholder="Search leads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>No leads found. Add your first lead to get started!</p>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Interested In</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Follow Up</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-white">{lead.name}</td>
                    <td className="px-4 py-3 text-slate-300">{lead.mobile_number}</td>
                    <td className="px-4 py-3 text-slate-300">{lead.interested_in || '-'}</td>
                    <td className="px-4 py-3 text-slate-300">{lead.follow_up_date || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                        {lead.lead_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        {lead.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button onClick={() => openModal(lead)} size="sm" variant="outline">Edit</Button>
                        <Button onClick={() => handleDelete(lead)} size="sm" variant="outline">Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={closeModal} title={editingLead ? 'Edit Lead' : 'Add New Lead'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
              <Input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Mobile *</label>
              <Input type="text" required value={formData.mobile_number} onChange={(e) => setFormData({...formData, mobile_number: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Interested In</label>
              <select value={formData.interested_in} onChange={(e) => setFormData({...formData, interested_in: e.target.value})} className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600">
                <option value="">Select</option>
                <option value="Motor">Motor</option>
                <option value="Health">Health</option>
                <option value="Life">Life</option>
                <option value="Non-Motor">Non-Motor</option>
                <option value="Mutual Funds">Mutual Funds</option>
                <option value="Others">Others</option>
              </select>
            </div>
            {formData.interested_in === 'Others' && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Specify Interest</label>
                <Input type="text" value={formData.other_interest} onChange={(e) => setFormData({...formData, other_interest: e.target.value})} placeholder="Enter interest type" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Policy Expiry Date</label>
              <Input type="date" value={formData.policy_expiry_date} onChange={(e) => setFormData({...formData, policy_expiry_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Follow Up Date</label>
              <Input type="date" value={formData.follow_up_date} onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
              <select value={formData.lead_status} onChange={(e) => setFormData({...formData, lead_status: e.target.value})} className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600">
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
              <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600">
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Referral By</label>
              <Input type="text" value={formData.referral_by} onChange={(e) => setFormData({...formData, referral_by: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600" />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" onClick={closeModal} variant="outline">Cancel</Button>
            <Button type="submit">{editingLead ? 'Update' : 'Add'} Lead</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
