import { memo } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Briefcase, Users, Upload, Wallet, BarChart3, Mail, Settings, Receipt, Shield, MessageSquare } from 'lucide-react'
import AIBackground from '../ui/AIBackground'
import AICube from '../ui/AICube'

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 border border-indigo-500/30 text-white shadow-lg' : 'text-slate-300 hover:text-white'}`

export default memo(function Sidebar() {
  const { user } = useAuth()
  
  const getMenuItems = () => {
    if (user?.role === 'admin') {
      return [
        { to: '/admin', icon: LayoutDashboard, label: 'Admin Dashboard', emoji: '🎛️' },
        { to: '/admin/users', icon: Users, label: 'Clients', emoji: '👥' },
        { to: '/admin/tools-pricing', icon: Settings, label: 'Tools Pricing', emoji: '⚙️' },
        { to: '/admin/transactions', icon: Receipt, label: 'Transactions', emoji: '🧾' },
        { to: '/candidates', icon: Users, label: 'Candidates', emoji: '📋' },
      ]
    }
    
    if (user?.client_type === 'insurance') {
      return [
        { to: '/insurance', icon: Shield, label: 'Dashboard', emoji: '🏠' },
        { to: '/insurance/customers', icon: Users, label: 'Customers', emoji: '👥' },
        { to: '/insurance/policies', icon: Shield, label: 'Policies', emoji: '📋' },
        { to: '/insurance/renewals', icon: LayoutDashboard, label: 'Renewals', emoji: '🔄' },
        { to: '/insurance/messages', icon: Mail, label: 'Messages', emoji: '💬' },
        { to: '/insurance/claims', icon: Briefcase, label: 'Claims', emoji: '📝' },
        { to: '/insurance/reports', icon: BarChart3, label: 'Reports', emoji: '📊' },
        { to: '#', icon: Wallet, label: 'Wallet 🔒', emoji: '💰', disabled: true },
      ]
    }
    
    // Default HR client menu
    return [
      { to: '/dashboard', icon: LayoutDashboard, label: 'HR Dashboard', emoji: '📊' },
      { to: '/jobs', icon: Briefcase, label: 'Jobs', emoji: '💼' },
      { to: '/candidates', icon: Users, label: 'Candidates', emoji: '👥' },
      { to: '/upload', icon: Upload, label: 'Resume Upload', emoji: '📤' },
      { to: '/wallet', icon: Wallet, label: 'Wallet', emoji: '💰' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics', emoji: '📈' },
      { to: '/emails', icon: Mail, label: 'Email History', emoji: '📧' },
    ]
  }
  
  const menuItems = getMenuItems()
  
  const getSidebarTitle = () => {
    if (user?.role === 'admin') return null
    if (user?.name) return `🏢 ${user.name}`
    if (user?.client_type === 'insurance') return '🏢 Insurance Agency'
    return '🏢 HR Agency'
  }
  
  const sidebarTitle = getSidebarTitle()
  
  return (
    <aside className="hidden md:block w-[var(--sidebar-width)] border-r border-slate-800/50 bg-slate-900/40 backdrop-blur-xl relative z-10">
      <AIBackground />
      <div className="p-6 border-b border-slate-800/50">
        {/* VB Automation Logo with Rotating Cube */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <AICube size={32} />
          <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
            VB Automation
          </Link>
        </div>
        
        {/* Client-specific Logo */}
        {user?.client_type === 'insurance' && (
          <div className="mb-3 flex justify-center">
            <img 
              src={user?.email?.toLowerCase().includes('joban') 
                ? 'https://drive.google.com/thumbnail?id=1R2CNXhJr0rqnYkML3g4GWKPdaZt8-ffc&sz=w300'
                : 'https://drive.google.com/thumbnail?id=1FzuJ03-cQ8VA7fAUDcoz1QW-2_We5FiL&sz=w300'
              }
              alt="Company Logo" 
              className="h-16 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}
        
        {sidebarTitle && (
          <div className="text-lg font-semibold text-white text-center">
            {sidebarTitle.replace(/🏢\s*/, '')}
          </div>
        )}
        {user?.client_type && (
          <div className="text-xs text-indigo-300 mt-1 text-center">
            {user.client_type === 'insurance' ? 'Insurance Agency' : 'HR Agency'}
          </div>
        )}
        <div className="text-xs text-slate-400 truncate mt-1 text-center" title={user?.email || ''}>
          {user?.email}
        </div>
      </div>
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.to}>
            {(item as any).disabled ? (
              <div 
                className="group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 opacity-50 cursor-not-allowed"
                title="Coming Soon - Premium Feature"
                onClick={() => alert('🔒 Premium Feature\n\nWallet feature coming soon for insurance agencies.\n\nContact support for more info.')}
              >
                <div className="flex items-center gap-3 w-full">
                  <item.icon className="w-5 h-5 opacity-70" />
                  <span className="font-medium">{item.label}</span>
                </div>
              </div>
            ) : (
              <NavLink to={item.to} className={linkCls} title={item.label}>
                <div className="flex items-center gap-3 w-full hover:translate-x-1 transition-transform duration-150">
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
              </NavLink>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
})
