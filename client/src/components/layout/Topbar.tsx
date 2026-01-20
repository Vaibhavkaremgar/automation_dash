import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Menu, RefreshCw, Search, X } from 'lucide-react'
import AICube from '../ui/AICube'
import Modal from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { api } from '../../lib/api'

export default memo(function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { user, logout } = useAuth()
  const clientKey = user?.email?.toLowerCase().includes('joban') ? 'joban' : 'kmg'
  const navigate = useNavigate()
  const isInsuranceClient = user?.client_type === 'insurance'
  const [selectedVertical, setSelectedVertical] = useState(() => {
    return localStorage.getItem('insuranceVerticalFilter') || 'all'
  })
  const [profileName, setProfileName] = useState(() => {
    const stored = localStorage.getItem('activeProfile')
    if (stored) {
      try {
        const profile = JSON.parse(stored)
        return profile.profile_name
      } catch (e) {
        return null
      }
    }
    return null
  })
  const [syncing, setSyncing] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showVerticalMenu, setShowVerticalMenu] = useState(false)

  const handleSync = async () => {
    try {
      setSyncing(true)
      const filter = localStorage.getItem('insuranceVerticalFilter') || 'all'
      await api.post('/api/insurance/sync/from-sheet', { filter })
      await api.post('/api/insurance/claims/sync/from-sheet')
      alert('Sync completed successfully!')
      window.location.reload()
    } catch (error) {
      console.error('Sync failed:', error)
      alert('Sync failed. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) return
    try {
      setSearching(true)
      const res = await api.get(`/api/insurance/customers/search?q=${encodeURIComponent(searchTerm)}`)
      setSearchResults(res.data)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  const sendCustomerSummary = async (customer: any) => {
    const policies = customer.policies || []
    let summary = `Dear ${customer.name},\n\nHere is your policy summary:\n\n`
    
    if (policies.length > 0) {
      policies.forEach((p: any, i: number) => {
        const isMotor = p.vertical === 'motor' || p.vertical === '2-wheeler'
        summary += `${i + 1}. ${p.product || 'Policy'} - ${p.company}\n`
        if (isMotor && p.registration_no) {
          summary += `   Registration: ${p.registration_no}\n`
        }
        summary += `   Premium: ₹${p.premium}\n`
        summary += `   Renewal: ${p.renewal_date}\n`
        summary += `   Status: ${p.status}\n\n`
      })
    } else {
      const isMotor = customer.vertical === 'motor' || customer.vertical === '2-wheeler'
      if (isMotor && customer.registration_no) {
        summary += `Registration: ${customer.registration_no}\n`
      }
      summary += `Company: ${customer.company}\n`
      summary += `Premium: ₹${customer.premium}\n`
      summary += `Renewal: ${customer.renewal_date}\n`
      summary += `Status: ${customer.status}\n\n`
    }
    
    summary += `For any queries, feel free to contact us.\n\nThank you!\n\n`
    
    if (clientKey === 'joban') {
      summary += `Warm regards,\nJobanputra's Insurance Shoppe\nYour Trusted Insurance Partner`
    } else {
      summary += `Warm regards,\nKrishna Mohan Gupta\nCertified Insurance & Mutual Funds Advisor`
    }
    
    try {
      await api.post('/api/insurance/log-message-frontend', {
        customer_id: customer.id,
        customer_name: customer.name,
        message_type: 'policy_summary',
        channel: 'whatsapp',
        message_content: summary,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log message:', error)
    }
    
    window.open(`https://wa.me/${customer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(summary)}`, '_blank', 'noopener,noreferrer')
  }

  const sendAllSummary = async () => {
    if (searchResults.length === 0) return
    
    let summary = ''
    
    searchResults.forEach((customer, i) => {
      const isMotor = customer.vertical === 'motor' || customer.vertical === '2-wheeler'
      summary += `${i + 1}. ${customer.name}\n`
      summary += `   Mobile: ${customer.mobile_number}\n`
      if (isMotor && customer.registration_no) {
        summary += `   Vehicle: ${customer.registration_no}\n`
      }
      summary += `   Company: ${customer.company}\n`
      summary += `   Premium: ₹${customer.premium?.toLocaleString()}\n`
      summary += `   Renewal: ${customer.renewal_date}\n`
      summary += `   Status: ${customer.status}\n\n`
    })
    
    summary += `Total Premium: ₹${searchResults.reduce((sum, c) => sum + (c.premium || 0), 0).toLocaleString()}\n\n`
    summary += `For any queries, feel free to contact us.\n\nThank you!\n\n`
    
    if (clientKey === 'joban') {
      summary += `Warm regards,\nJobanputra's Insurance Shoppe\nYour Trusted Insurance Partner`
    } else {
      summary += `Warm regards,\nKrishna Mohan Gupta\nCertified Insurance & Mutual Funds Advisor`
    }
    
    if (searchResults.length > 0) {
      const firstCustomer = searchResults[0]
      
      try {
        await api.post('/api/insurance/log-message-frontend', {
          customer_id: firstCustomer.id,
          customer_name: firstCustomer.name,
          message_type: 'bulk_summary',
          channel: 'whatsapp',
          message_content: summary,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
      } catch (error) {
        console.error('Failed to log message:', error)
      }
      
      window.open(`https://wa.me/${firstCustomer.mobile_number.replace(/\D/g, '')}?text=${encodeURIComponent(summary)}`, '_blank', 'noopener,noreferrer')
    }
  }

  const handleSelectVertical = (vertical: string, subFilter?: string) => {
    setSelectedVertical(vertical)
    localStorage.setItem('insuranceVerticalFilter', vertical)
    if (subFilter) {
      localStorage.setItem('insuranceGeneralSubFilter', subFilter)
      window.dispatchEvent(new CustomEvent('insuranceGeneralSubFilterChange', { detail: subFilter }))
    }
    window.dispatchEvent(new CustomEvent('insuranceVerticalChange', { detail: vertical }))
    setShowVerticalMenu(false)
  }
  
  return (
    <>
    <header className="h-14 border-b border-slate-800 bg-slate-900/60 backdrop-blur flex items-center justify-between px-2 md:px-4 relative">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button className="md:hidden p-2 rounded border border-slate-800 hover:bg-slate-800/60" onClick={onMenu} aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <AICube size={20} className="hidden sm:block" />
        <div className="hidden md:block font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">VB Automations</div>
        <button
          onClick={() => navigate('/profiles')}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-900/20 border border-indigo-700/50 rounded-lg hover:bg-indigo-900/40 transition-all"
          title={profileName || 'Profile'}
        >
          <span className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">
            {profileName ? profileName.charAt(0).toUpperCase() : '👤'}
          </span>
          <span className="hidden md:inline text-sm font-medium">{profileName || 'Profile'}</span>
        </button>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isInsuranceClient && (
          <button 
            onClick={() => setShowVerticalMenu(!showVerticalMenu)}
            className="px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm hover:bg-slate-700 transition-all"
          >
            <span className="md:hidden">
              {selectedVertical === 'all' ? '📋' : 
               selectedVertical === 'general' ? '🏢' : 
               selectedVertical === '4-wheeler' ? '🚗' :
               selectedVertical === 'motor' ? '🚙' : 
               selectedVertical === '2-wheeler' ? '🏍️' : 
               selectedVertical === 'health' || selectedVertical === 'health-base' || selectedVertical === 'health-topup' ? '🏥' : 
               selectedVertical === 'non-motor' ? '🏠' : 
               selectedVertical === 'life' ? '👤' : '📋'}
            </span>
            <span className="hidden md:inline">
              {selectedVertical === 'all' ? '📋 All Types' : 
               selectedVertical === 'general' ? '🏢 General' : 
               selectedVertical === '4-wheeler' ? '🚗 4-Wheeler' :
               selectedVertical === 'motor' ? '🚙 All Motor' : 
               selectedVertical === '2-wheeler' ? '🏍️ 2-Wheeler' : 
               selectedVertical === 'health-base' ? '🏥 Health Base' :
               selectedVertical === 'health-topup' ? '🏥 Health Topup' :
               selectedVertical === 'health' ? '🏥 All Health' : 
               selectedVertical === 'non-motor' ? '🏠 Non-Motor' : 
               selectedVertical === 'life' ? '👤 Life' : '📋 All Types'}
            </span>
          </button>
        )}
        
        {isInsuranceClient && (
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-900/20 border border-cyan-700/50 rounded-lg hover:bg-cyan-900/40 transition-all disabled:opacity-50"
              title="Sync from Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline text-sm font-medium">{syncing ? 'Syncing...' : 'Sync'}</span>
            </button>
            
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-900/20 border border-purple-700/50 rounded-lg hover:bg-purple-900/40 transition-all"
              title="Search Customers"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline text-sm font-medium">Search</span>
            </button>
          </>
        )}

        
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700/50 hover:border-red-600 rounded-lg text-red-400 hover:text-red-300 transition-all"
          title="Logout"
        >
          <span>🚪</span>
          <span className="hidden md:inline text-sm font-medium">Logout</span>
        </button>
      </div>
    </header>

    {/* Vertical Filter Modal */}
    <Modal open={showVerticalMenu} onClose={() => setShowVerticalMenu(false)} title="Select Insurance Type">
      <div className="space-y-2">
        <button className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded transition-all" onClick={() => handleSelectVertical('all')}>📋 All Types</button>
        <button className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded transition-all" onClick={() => handleSelectVertical('general', 'all')}>🏢 General</button>
        <button className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded transition-all" onClick={() => handleSelectVertical('4-wheeler', '4-wheeler')}>🚗 4-Wheeler</button>
        <button className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded transition-all" onClick={() => handleSelectVertical('2-wheeler', '2-wheeler')}>🏍️ 2-Wheeler</button>
        <button className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded transition-all" onClick={() => handleSelectVertical('motor', 'motor')}>🚙 All Motor</button>
        <button className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded transition-all" onClick={() => handleSelectVertical('health-base', 'health-base')}>🏥 Health Base</button>
        <button className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded transition-all" onClick={() => handleSelectVertical('health-topup', 'health-topup')}>🏥 Health Topup</button>
        <button className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded transition-all" onClick={() => handleSelectVertical('health', 'health')}>🏥 All Health</button>
        <button className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded transition-all" onClick={() => handleSelectVertical('non-motor')}>🏠 Non-Motor</button>
        <button className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded transition-all" onClick={() => handleSelectVertical('life')}>👤 Life</button>
      </div>
    </Modal>
    
    {/* Search Modal */}
    <Modal open={showSearch} onClose={() => { setShowSearch(false); setSearchTerm(''); setSearchResults([]); }} title="Search Customers">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search by name, mobile, G CODE, vehicle, or any field..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="flex justify-between items-center p-3 bg-cyan-900/20 border border-cyan-700/50 rounded-lg">
            <span className="text-white font-medium">{searchResults.length} customers found</span>
            <Button size="sm" onClick={sendAllSummary}>
              📤 Send All Summary
            </Button>
          </div>
        )}
        
        <div className="max-h-[500px] overflow-y-auto space-y-3">
          {searchResults.length === 0 && searchTerm && !searching && (
            <p className="text-center text-slate-400 py-8">No customers found</p>
          )}
          {searchResults.map((customer) => (
            <div key={customer.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-white">{customer.name}</h4>
                  <p className="text-sm text-slate-300">{customer.mobile_number}</p>
                  <p className="text-sm text-slate-400">Vehicle: {customer.registration_no}</p>
                  <p className="text-sm text-slate-400">Company: {customer.company}</p>
                  <p className="text-sm text-slate-400">Premium: ₹{customer.premium}</p>
                  <p className="text-sm text-slate-400">Renewal: {customer.renewal_date}</p>
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                    customer.status === 'done' ? 'bg-green-500/20 text-green-300' : 
                    customer.status === 'lost' ? 'bg-red-500/20 text-red-300' : 
                    'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {customer.status}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => sendCustomerSummary(customer)}
                  className="ml-4"
                >
                  📱 Message
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
    </>
  )
})
