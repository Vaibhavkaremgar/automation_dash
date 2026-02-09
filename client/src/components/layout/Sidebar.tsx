import { memo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Briefcase, Users, Upload, Wallet, BarChart3, Mail, Settings, Receipt, Shield, MessageSquare, UserPlus, FileText } from 'lucide-react'
import AIBackground from '../ui/AIBackground'
import AICube from '../ui/AICube'

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/50 transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 border border-indigo-500/30 text-white shadow-lg' : 'text-slate-300 hover:text-white'}`

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
        { to: '/insurance/renewals', icon: LayoutDashboard, label: 'Renewals', emoji: '🔄' },
        { to: '/insurance/customers', icon: Users, label: 'Customers', emoji: '👥' },
        { to: '/insurance/policies', icon: Shield, label: 'Policies', emoji: '📋' },
        { to: '/insurance/upsell', icon: MessageSquare, label: 'Upsell & Cross-sell', emoji: '🎯' },
        { to: '/insurance/messages', icon: Mail, label: 'Messages', emoji: '💬' },
        { to: '/insurance/claims', icon: Briefcase, label: 'Claims', emoji: '📝' },
        { to: '/insurance/reports', icon: BarChart3, label: 'Reports', emoji: '📊' },
        { to: '/insurance/leads', icon: UserPlus, label: 'Lead Management', emoji: '🎯' },
        { to: '/insurance/doc-uploader', icon: FileText, label: 'Doc Uploader', emoji: '📄' },
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
    <aside className="hidden md:flex md:flex-col w-[var(--sidebar-width)] h-screen border-r border-slate-800/50 bg-slate-900/40 backdrop-blur-xl relative z-10">
      <AIBackground />
      <div className="p-3 border-b border-slate-800/50 flex-shrink-0">
        {/* Client Logo at Top */}
        {user?.client_type === 'insurance' && (
          <div className="mb-2 flex justify-center">
            <img 
              src={user?.email?.toLowerCase().includes('joban') 
                ? '/logos/joban_putra.jpg'
                : '/logos/KMG_enhanced_logo.png'
              }
              alt="Company Logo" 
              className={`h-14 w-auto object-contain max-w-full ${
                user?.email?.toLowerCase().includes('joban') 
                  ? 'bg-white rounded-lg p-1.5' 
                  : ''
              }`}
            />
          </div>
        )}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-600 to-transparent mb-2"></div>
        
        {sidebarTitle && (
          <div className="text-base font-semibold text-center">
            {user?.email?.toLowerCase().includes('joban') ? (
              <>
                <span className="text-blue-500">Jobanputra's</span>
                {' '}
                <span className="text-green-400">Insurance Shoppe</span>
              </>
            ) : user?.email?.toLowerCase().includes('kmg') ? (
              <>
                <span className="text-blue-600">Krishna Mohan</span>
                {' '}
                <span className="text-pink-400">Gupta Palla</span>
              </>
            ) : (
              <span className="text-white">{sidebarTitle.replace(/🏢\s*/, '')}</span>
            )}
          </div>
        )}
        {user?.client_type && (
          <div className="text-xs text-indigo-300 mt-0.5 text-center">
            {user?.email?.toLowerCase().includes('kmg') ? 'Certified Insurance & Mutual Funds Distributor' : user.client_type === 'insurance' ? 'Insurance Agency' : 'HR Agency'}
          </div>
        )}
        <div className="text-xs text-slate-400 truncate mt-0.5 text-center" title={user?.email || ''}>
          {user?.email?.toLowerCase().includes('joban') ? 'Support@jobanputras.com' : user?.email}
        </div>
      </div>
      <nav className="p-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
        {menuItems.map((item) => (
          <div key={item.to}>
            {(item as any).disabled ? (
              <div 
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 opacity-50 cursor-not-allowed"
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
        </div>
      </nav>
    </aside>
  )
})
