import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { api } from '../lib/api';

interface Customer {
  id: number;
  name: string;
  mobile_number: string;
  email: string;
  vertical: string;
  company: string;
  registration_no: string;
  premium: number;
  renewal_date: string;
  status: string;
  dob?: string;
  g_code?: string;
  pancard?: string;
  aadhar_card?: string;
  product_type?: string;
}

const ALL_POLICY_TYPES = [
  { key: 'motor-2wh', label: 'Motor - 2-Wheeler', icon: '🏍️', vertical: 'motor', productType: '2-wheeler' },
  { key: 'motor-4wh', label: 'Motor - 4-Wheeler', icon: '🚗', vertical: 'motor', productType: '4-wheeler' },
  { key: 'health-base', label: 'Health - Base', icon: '🏥', vertical: 'health', productType: 'health base' },
  { key: 'health-topup', label: 'Health - Topup', icon: '💊', vertical: 'health', productType: 'topup' },
  { key: 'health-ghi-gpa', label: 'Health - GHI/GPA', icon: '🏥', vertical: 'health', productType: 'ghi/gpa' },
  { key: 'health-pa', label: 'Health - PA', icon: '🛡️', vertical: 'health', productType: 'pa' },
  { key: 'non-motor-marine', label: 'Non-Motor - Marine', icon: '⛵', vertical: 'non-motor', productType: 'marine' },
  { key: 'non-motor-fire', label: 'Non-Motor - Fire', icon: '🔥', vertical: 'non-motor', productType: 'fire' },
  { key: 'non-motor-burglary', label: 'Non-Motor - Burglary', icon: '🏠', vertical: 'non-motor', productType: 'burglary' },
  { key: 'life', label: 'Life Insurance', icon: '👤', vertical: 'life', productType: null },
];

export default function UpsellCrossSell() {
  const { user } = useAuth();
  const clientKey = user?.email?.toLowerCase().includes('joban') ? 'joban' : 'kmg';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [customerPolicies, setCustomerPolicies] = useState<string[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteCustomerId, setNoteCustomerId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [showCustomMessageModal, setShowCustomMessageModal] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/insurance/customers?vertical=all');
      setCustomers(res.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPortfolio = async (customer: Customer) => {
    setSelectedCustomer(customer);
    
    const res = await api.get(`/api/insurance/customers?vertical=all`);
    const allCustomerPolicies = res.data.filter((c: Customer) => {
      if (customer.name && c.name && customer.name.toLowerCase().trim() === c.name.toLowerCase().trim()) return true;
      if (customer.dob && c.dob && customer.dob.trim() === c.dob.trim()) return true;
      if (customer.g_code && c.g_code && customer.g_code.toLowerCase().trim() === c.g_code.toLowerCase().trim()) return true;
      if (customer.pancard && c.pancard && customer.pancard.toUpperCase().trim() === c.pancard.toUpperCase().trim()) return true;
      if (customer.aadhar_card && c.aadhar_card && customer.aadhar_card.trim() === c.aadhar_card.trim()) return true;
      return false;
    });
    
    const existingKeys = allCustomerPolicies.map((p: Customer) => {
      if (p.vertical === 'motor') {
        if (p.product_type?.includes('2')) return 'motor-2wh';
        if (p.product_type?.includes('4')) return 'motor-4wh';
      } else if (p.vertical === 'health') {
        if (p.product_type?.toLowerCase() === 'health base') return 'health-base';
        if (p.product_type?.toLowerCase() === 'topup') return 'health-topup';
        if (p.product_type?.toLowerCase() === 'ghi/gpa') return 'health-ghi-gpa';
        if (p.product_type?.toLowerCase() === 'pa') return 'health-pa';
      } else if (p.vertical === 'non-motor') {
        if (p.product_type?.toLowerCase() === 'marine') return 'non-motor-marine';
        if (p.product_type?.toLowerCase() === 'fire') return 'non-motor-fire';
        if (p.product_type?.toLowerCase() === 'burglary') return 'non-motor-burglary';
      } else if (p.vertical === 'life') return 'life';
      return null;
    }).filter(Boolean);
    
    setCustomerPolicies(existingKeys);
    setSelectedPolicies([]);
    setShowPortfolioModal(true);
  };

  const getMissingPolicies = () => {
    return ALL_POLICY_TYPES.filter(policy => !customerPolicies.includes(policy.key));
  };

  const getExistingPolicies = () => {
    return ALL_POLICY_TYPES.filter(policy => customerPolicies.includes(policy.key));
  };

  const togglePolicy = (policyKey: string) => {
    setSelectedPolicies(prev => 
      prev.includes(policyKey) 
        ? prev.filter(k => k !== policyKey)
        : [...prev, policyKey]
    );
  };

  const selectAllPolicies = () => {
    const missing = getMissingPolicies();
    setSelectedPolicies(missing.map(p => p.key));
  };

  const logWhatsAppMessage = async (customerId: number, customerName: string, message: string) => {
    try {
      await api.post('/api/insurance/log-message-frontend', {
        customer_id: customerId,
        customer_name: customerName,
        message_type: 'upsell_crosssell',
        channel: 'whatsapp',
        message_content: message,
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log message:', error);
    }
  };

  const sendCustomMessage = () => {
    if (!selectedCustomer || !customMessage.trim()) return;
    
    logWhatsAppMessage(selectedCustomer.id, selectedCustomer.name, customMessage);
    window.open(`https://wa.me/${selectedCustomer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(customMessage)}`, '_blank', 'noopener,noreferrer');
    setShowCustomMessageModal(false);
    setCustomMessage('');
  };

  const sendUpsellMessage = () => {
    if (!selectedCustomer) return;
    
    const existing = getExistingPolicies();
    const missing = getMissingPolicies().filter(p => selectedPolicies.includes(p.key));
    
    let message = `Dear ${selectedCustomer.name},\n\n`;
    message += `I hope this message finds you well! 😊\n\n`;
    message += `We truly appreciate your trust in us`;
    
    if (existing.length > 0) {
      message += ` for your ${existing.map(p => p.label).join(', ')}`;
    }
    message += `.\n\n`;
    
    if (missing.length > 0) {
      message += `As your insurance advisor, I wanted to personally reach out to ensure you and your loved ones have complete protection. I noticed you might benefit from:\n\n`;
      
      missing.forEach((policy, i) => {
        message += `${policy.icon} *${policy.label}*\n`;
        
        if (policy.key === 'health-base' || policy.key === 'health-topup' || policy.key === 'health-ghi-gpa' || policy.key === 'health-pa') {
          message += `   ✓ Cashless hospitalization at 10,000+ hospitals\n`;
          message += `   ✓ Coverage for medical emergencies & critical illnesses\n`;
          message += `   ✓ Tax benefits up to ₹25,000 under Section 80D\n`;
        } else if (policy.key === 'life') {
          message += `   ✓ Financial security for your family's future\n`;
          message += `   ✓ Coverage for loans, education & daily expenses\n`;
          message += `   ✓ Tax benefits up to ₹1.5 lakhs under Section 80C\n`;
        } else if (policy.key === 'motor-2wh' || policy.key === 'motor-4wh') {
          message += `   ✓ Comprehensive coverage for your vehicle\n`;
          message += `   ✓ Protection against accidents, theft & damages\n`;
          message += `   ✓ Cashless repairs at authorized garages\n`;
        } else if (policy.key === 'non-motor-marine' || policy.key === 'non-motor-fire' || policy.key === 'non-motor-burglary') {
          message += `   ✓ Protection for home, travel & valuable assets\n`;
          message += `   ✓ Coverage against fire, theft & natural calamities\n`;
          message += `   ✓ Peace of mind for unexpected events\n`;
        }
        message += `\n`;
      });
      
      message += `💡 *Why act now?*\n`;
      message += `• Get the best premium rates available\n`;
      message += `• Instant policy issuance within 24 hours\n`;
      message += `• Exclusive discounts for existing customers\n`;
      message += `• Complete family protection under one roof\n\n`;
      
      message += `I'd love to help you understand how these policies can benefit you and your family. Can we schedule a quick 10-minute call at your convenience?\n\n`;
    }
    
    message += `Feel free to reply to this message or call me directly. I'm here to help! 🙏\n\n`;
    
    if (clientKey === 'joban') {
      message += `Warm regards,\nJobanputra's Insurance Shoppe\nYour Trusted Insurance Partner`;
    } else {
      message += `Warm regards,\nKrishna Mohan Gupta\nCertified Insurance & Mutual Funds Advisor`;
    }
    
    logWhatsAppMessage(selectedCustomer.id, selectedCustomer.name, message);
    window.open(`https://wa.me/${selectedCustomer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile_number.includes(searchTerm)
  );

  const uniqueCustomers = filteredCustomers.reduce((acc, customer) => {
    const isDuplicate = acc.some(c => {
      if (customer.name && c.name && customer.name.toLowerCase().trim() === c.name.toLowerCase().trim()) return true;
      if (customer.dob && c.dob && customer.dob.trim() === c.dob.trim()) return true;
      if (customer.g_code && c.g_code && customer.g_code.toLowerCase().trim() === c.g_code.toLowerCase().trim()) return true;
      if (customer.pancard && c.pancard && customer.pancard.toUpperCase().trim() === c.pancard.toUpperCase().trim()) return true;
      if (customer.aadhar_card && c.aadhar_card && customer.aadhar_card.trim() === c.aadhar_card.trim()) return true;
      return false;
    });
    if (!isDuplicate) {
      acc.push(customer);
    }
    return acc;
  }, [] as Customer[]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🎯</span>
          <h1 className="text-2xl font-bold text-white">
            Upsell & Cross-sell
          </h1>
        </div>
        <p className="text-sm text-slate-400 ml-11">Suggest additional policies to your customers</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="🔍 Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-md"
        />
        <div className="mt-2 text-sm text-slate-500">
          {uniqueCustomers.length} customer{uniqueCustomers.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {uniqueCustomers.map((customer) => (
          <div
            key={customer.id}
            className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-slate-600 hover:bg-slate-800/70 transition-all cursor-pointer"
            onClick={() => openPortfolio(customer)}
          >
            <div className="flex items-start gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{customer.name}</h3>
                <p className="text-xs text-slate-400">{customer.mobile_number}</p>
              </div>
            </div>
            {customer.email && (
              <p className="text-xs text-slate-500 mb-2 truncate">{customer.email}</p>
            )}
            <Button 
              size="sm" 
              variant="outline"
              className="w-full"
              onClick={(e) => { e.stopPropagation(); openPortfolio(customer); }}
            >
              View Portfolio
            </Button>
          </div>
        ))}
      </div>

      {uniqueCustomers.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-xl text-slate-400">No customers found</p>
          <p className="text-sm text-slate-500 mt-2">Try adjusting your search</p>
        </div>
      )}

      {/* Portfolio Modal */}
      <Modal
        open={showPortfolioModal}
        onClose={() => { setShowPortfolioModal(false); setSelectedCustomer(null); }}
        title={`${selectedCustomer?.name} - Portfolio`}
      >
        <div className="flex flex-col h-[70vh]">
          <div className="flex-1 overflow-y-auto pr-4 space-y-6">
            {/* Customer Info */}
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <h3 className="font-semibold text-white mb-2">Customer Details</h3>
              <p className="text-sm text-slate-300">📱 {selectedCustomer?.mobile_number}</p>
              {selectedCustomer?.email && (
                <p className="text-sm text-slate-300">📧 {selectedCustomer?.email}</p>
              )}
            </div>

            {/* Existing Policies */}
            <div>
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-green-400">✅</span> Current Policies ({getExistingPolicies().length})
              </h3>
              {getExistingPolicies().length > 0 ? (
                <div className="space-y-2">
                  {getExistingPolicies().map((policy) => (
                    <div key={policy.key} className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{policy.icon}</span>
                        <div>
                          <p className="font-medium text-white">{policy.label}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">No policies yet</p>
              )}
            </div>

            {/* Suggested Policies */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="text-yellow-400">💡</span> Suggested Policies ({getMissingPolicies().length})
                </h3>
                {getMissingPolicies().length > 0 && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={selectAllPolicies}
                    >
                      Select All
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedPolicies([])}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              {getMissingPolicies().length > 0 ? (
                <div className="space-y-2">
                  {getMissingPolicies().map((policy) => (
                    <div 
                      key={policy.key}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPolicies.includes(policy.key)
                          ? 'bg-indigo-500/20 border-indigo-500/50'
                          : 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50'
                      }`}
                      onClick={() => togglePolicy(policy.key)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedPolicies.includes(policy.key)
                            ? 'bg-indigo-500 border-indigo-500'
                            : 'border-slate-500'
                        }`}>
                          {selectedPolicies.includes(policy.key) && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                        <span className="text-2xl">{policy.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-white">{policy.label}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                  <p className="text-green-400 font-medium">🎉 Customer has all policy types!</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 border-t border-slate-700 pt-4 mt-4 flex flex-col sm:flex-row gap-3">
            {getMissingPolicies().length > 0 && (
              <Button 
                onClick={sendUpsellMessage} 
                className="flex-1"
                disabled={selectedPolicies.length === 0}
              >
                <span className="hidden sm:inline">📱 Send Professional Message via WhatsApp</span>
                <span className="sm:hidden">📱 Send WhatsApp</span>
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => setShowCustomMessageModal(true)}
              className="flex-1 sm:flex-none"
            >
              💬 Send Custom Message
            </Button>
            <Button 
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNoteCustomerId(selectedCustomer?.id || null);
                setShowNoteModal(true);
              }}
              title="Add Note/Report"
              className="sm:w-auto"
            >
              📝 Add Note
            </Button>
          </div>
        </div>
      </Modal>

      {/* Custom Message Modal */}
      <Modal open={showCustomMessageModal} onClose={() => { setShowCustomMessageModal(false); setCustomMessage(''); }} title="Send Custom Message">
        <div className="space-y-4">
          <textarea
            className="w-full p-3 border rounded bg-slate-700 text-white min-h-[150px]"
            placeholder="Type your custom message here..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
          />
          <div className="flex gap-3">
            <Button onClick={sendCustomMessage} disabled={!customMessage.trim()} className="flex-1">
              📱 Send via WhatsApp
            </Button>
            <Button variant="outline" onClick={() => { setShowCustomMessageModal(false); setCustomMessage(''); }} className="flex-1">
              Cancel
            </Button>
          </div>
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
            <Button onClick={async () => {
              if (!noteCustomerId || !note) return;
              try {
                await api.post(`/api/insurance/customers/${noteCustomerId}/notes`, { note });
                
                try {
                  const { data: config } = await api.get('/api/insurance-config/config');
                  await api.post('/api/insurance/sync/to-sheet', {
                    tabName: config.tabName
                  });
                } catch (syncError) {
                  console.error('Sync to sheet failed:', syncError);
                }
                
                setShowNoteModal(false);
                setNote('');
                setNoteCustomerId(null);
                loadCustomers();
                alert('Note added and synced successfully');
              } catch (error) {
                console.error('Failed to add note:', error);
                alert('Failed to add note');
              }
            }}>Save Note</Button>
            <Button variant="outline" onClick={() => { setShowNoteModal(false); setNote(''); setNoteCustomerId(null); }}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
