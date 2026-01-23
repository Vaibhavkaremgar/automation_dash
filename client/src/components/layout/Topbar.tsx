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
  const [expandedMenu, setExpandedMenu] = useState<Set<string>>(new Set())
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    const stored = localStorage.getItem('insuranceMonthFilter')
    return stored ? JSON.parse(stored) : []
  })
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return localStorage.getItem('insuranceYearFilter') || new Date().getFullYear().toString()
  })
  const [filterEnabled, setFilterEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('insuranceFilterEnabled')
    return stored ? JSON.parse(stored) : true
  })
  const [showMonthFilter, setShowMonthFilter] = useState(false)

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
    setExpandedMenu(new Set())
  }

  const handleMonthToggle = (month: string) => {
    const updated = selectedMonths.includes(month)
      ? selectedMonths.filter(m => m !== month)
      : [...selectedMonths, month]
    setSelectedMonths(updated)
    localStorage.setItem('insuranceMonthFilter', JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('insuranceMonthFilterChange', { detail: updated }))
  }

  const handleYearChange = (year: string) => {
    setSelectedYear(year)
    localStorage.setItem('insuranceYearFilter', year)
    window.dispatchEvent(new CustomEvent('insuranceYearFilterChange', { detail: year }))
  }

  const handleFilterToggle = (enabled: boolean) => {
    setFilterEnabled(enabled)
    localStorage.setItem('insuranceFilterEnabled', JSON.stringify(enabled))
    window.dispatchEvent(new CustomEvent('insuranceFilterEnabledChange', { detail: enabled }))
  }

  const toggleMenu = (key: string) => {
    const newSet = new Set(expandedMenu)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setExpandedMenu(newSet)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ]

  const menuStructure = [
    { label: '📊 All', value: 'all' },
    { label: '🏢 General', value: 'general', submenu: [
      { label: '🏢 All General', value: 'general-all' },
      { label: '🚙 Motor', value: 'motor', submenu: [
        { label: '🏍️ 2-Wheeler', value: '2-wheeler' },
        { label: '🚗 4-Wheeler', value: '4-wheeler' },
        { label: '🚙 All Motor', value: 'motor-all' }
      ]},
      { label: '🏥 Health', value: 'health', submenu: [
        { label: '🏥 All Health', value: 'health-all' },
        { label: '🏥 Health Base', value: 'health-base' },
        { label: '🏥 Health Topup', value: 'health-topup' },
        { label: '🏥 PA', value: 'health-pa' },
        { label: '🏥 GHI/GPA', value: 'health-ghi-gpa' }
      ]},
      { label: '🏠 Non-Motor', value: 'non-motor', submenu: [
        { label: '🌊 Marine', value: 'marine' },
        { label: '🔥 Fire', value: 'fire' },
        { label: '🔐 Burglary', value: 'burglary' },
        { label: '📦 Others', value: 'non-motor-others' },
        { label: '🏠 All Non-Motor', value: 'non-motor-all' }
      ]}
    ]},
    { label: '👤 Life', value: 'life' }
  ]

  const getDisplayLabel = () => {
    const labelMap: Record<string, string> = {
      'all': '📊 All',
      'general': '🏢 General',
      'general-all': '🏢 All General',
      'motor': '🚙 Motor',
      'motor-all': '🚙 All Motor',
      '2-wheeler': '🏍️ 2-Wheeler',
      '4-wheeler': '🚗 4-Wheeler',
      'health': '🏥 Health',
      'health-all': '🏥 All Health',
      'health-base': '🏥 Health Base',
      'health-topup': '🏥 Health Topup',
      'health-pa': '🏥 PA',
      'health-ghi-gpa': '🏥 GHI/GPA',
      'non-motor': '🏠 Non-Motor',
      'non-motor-all': '🏠 All Non-Motor',
      'marine': '🌊 Marine',
      'fire': '🔥 Fire',
      'burglary': '🔐 Burglary',
      'non-motor-others': '📦 Others',
      'life': '👤 Life'
    }
    return labelMap[selectedVertical] || '📊 All'
  }

  const renderMenuItems = (items: any[], level: number = 0): JSX.Element => (
    <>
      {items.map((item) => {
        const itemKey = `${level}-${item.value}`
        const isExpanded = expandedMenu.has(itemKey)
        return (
          <div key={item.value}>
            <button
              className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 rounded transition-all flex items-center justify-between"
              onClick={() => {
                if (item.submenu) {
                  toggleMenu(itemKey)
                } else {
                  handleSelectVertical(item.value, item.value)
                }
              }}
            >
              <span>{item.label}</span>
              {item.submenu && <span className={`ml-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>}
            </button>
            {item.submenu && isExpanded && (
              <div className="pl-4 bg-slate-700/30">
                {renderMenuItems(item.submenu, level + 1)}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
  
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
          <>
            <button 
              onClick={() => setShowVerticalMenu(!showVerticalMenu)}
              className="px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm hover:bg-slate-700 transition-all"
            >
              <span className="md:hidden">
                {getDisplayLabel().split(' ')[0]}
              </span>
              <span className="hidden md:inline">
                {getDisplayLabel()}
              </span>
            </button>
            <button
              onClick={() => setShowMonthFilter(!showMonthFilter)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                filterEnabled
                  ? 'bg-slate-800/60 border border-slate-700 text-white hover:bg-slate-700'
                  : 'bg-slate-700/40 border border-slate-600 text-slate-400'
              }`}
              title="Filter by Year & Months"
            >
              <span className="md:hidden">📅</span>
              <span className="hidden md:inline">
                📅 {filterEnabled ? `${selectedYear} ${selectedMonths.length > 0 ? `(${selectedMonths.length}m)` : '(All)'}` : 'No Filter'}
              </span>
            </button>
          </>
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

    <Modal open={showMonthFilter} onClose={() => setShowMonthFilter(false)} title="Filter by Year & Months">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterToggle(true)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              filterEnabled
                ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-300'
                : 'bg-slate-700/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
            }`}
          >
            With Filter
          </button>
          <button
            onClick={() => handleFilterToggle(false)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              !filterEnabled
                ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-300'
                : 'bg-slate-700/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
            }`}
          >
            No Filter
          </button>
        </div>

        {filterEnabled && (
          <>
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Select Year</label>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Select Months</label>
              <div className="grid grid-cols-3 gap-2">
                {months.map((month) => (
                  <button
                    key={month.value}
                    onClick={() => handleMonthToggle(month.value)}
                    className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                      selectedMonths.includes(month.value)
                        ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-300'
                        : 'bg-slate-700/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {month.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setSelectedMonths([])
                  localStorage.setItem('insuranceMonthFilter', JSON.stringify([]))
                  window.dispatchEvent(new CustomEvent('insuranceMonthFilterChange', { detail: [] }))
                }}
                variant="outline"
              >
                Clear Months
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const allMonths = months.map(m => m.value)
                  setSelectedMonths(allMonths)
                  localStorage.setItem('insuranceMonthFilter', JSON.stringify(allMonths))
                  window.dispatchEvent(new CustomEvent('insuranceMonthFilterChange', { detail: allMonths }))
                }}
                variant="outline"
              >
                Select All Months
              </Button>
            </div>
          </>
        )}
        <Button
          onClick={() => {
            setShowMonthFilter(false)
            navigate('/insurance/dashboard')
          }}
          className="w-full"
        >
          Apply Filter
        </Button>
      </div>
    </Modal>

    <Modal open={showVerticalMenu} onClose={() => { setShowVerticalMenu(false); setExpandedMenu(new Set()); }} title="Select Insurance Type">
      <div className="space-y-2">
        {renderMenuItems(menuStructure)}
      </div>
    </Modal>
    
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
