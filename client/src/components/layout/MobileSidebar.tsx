import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { X, LayoutDashboard, Briefcase, Users, Upload, Cpu, Wallet, BarChart3, Mail, Settings, Shield } from 'lucide-react'

export default function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  return (
    <div className={`fixed inset-0 z-50 md:hidden transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside className={`absolute left-0 top-0 h-full w-72 bg-slate-900 border-r border-slate-800 p-4 transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Client-specific Logo */}
            <img 
              src={user?.email?.toLowerCase().includes('joban') 
                ? 'https://drive.google.com/thumbnail?id=1R2CNXhJr0rqnYkML3g4GWKPdaZt8-ffc&sz=w200'
                : 'https://drive.google.com/thumbnail?id=1FzuJ03-cQ8VA7fAUDcoz1QW-2_We5FiL&sz=w200'
              }
              alt="Logo" 
              className="h-8 w-auto object-contain"
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
            <Link to="/" onClick={onClose} className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">VB Automations</Link>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-xs text-slate-400 mb-2 truncate">{user?.email}</div>
        <nav className="space-y-1 text-sm">
          {user?.role === 'client' && user?.client_type === 'insurance' && (
            <>
              <Item to="/insurance" icon={<Shield className="w-4 h-4"/>} onClose={onClose}>Dashboard</Item>
              <Item to="/insurance/customers" icon={<Users className="w-4 h-4"/>} onClose={onClose}>Customers</Item>
              <Item to="/insurance/policies" icon={<Shield className="w-4 h-4"/>} onClose={onClose}>Policies</Item>
              <Item to="/insurance/renewals" icon={<LayoutDashboard className="w-4 h-4"/>} onClose={onClose}>Renewals</Item>
              <Item to="/insurance/claims" icon={<Briefcase className="w-4 h-4"/>} onClose={onClose}>Claims</Item>
              <Item to="/insurance/reports" icon={<BarChart3 className="w-4 h-4"/>} onClose={onClose}>Reports</Item>
              <Item to="/wallet" icon={<Wallet className="w-4 h-4"/>} onClose={onClose}>Wallet</Item>
            </>
          )}
          {user?.role === 'client' && user?.client_type !== 'insurance' && (
            <>
              <Item to="/dashboard" icon={<LayoutDashboard className="w-4 h-4"/>} onClose={onClose}>Dashboard</Item>
              <Item to="/jobs" icon={<Briefcase className="w-4 h-4"/>} onClose={onClose}>Jobs</Item>
              <Item to="/candidates" icon={<Users className="w-4 h-4"/>} onClose={onClose}>Candidates</Item>
              <Item to="/upload" icon={<Upload className="w-4 h-4"/>} onClose={onClose}>Resume Upload</Item>
              <Item to="/toolkit" icon={<Cpu className="w-4 h-4"/>} onClose={onClose}>AI Toolkit</Item>
              <Item to="/wallet" icon={<Wallet className="w-4 h-4"/>} onClose={onClose}>Wallet</Item>
              <Item to="/analytics" icon={<BarChart3 className="w-4 h-4"/>} onClose={onClose}>Analytics</Item>
              <Item to="/emails" icon={<Mail className="w-4 h-4"/>} onClose={onClose}>Email History</Item>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <Item to="/admin" icon={<LayoutDashboard className="w-4 h-4"/>} onClose={onClose}>Admin Dashboard</Item>
              <Item to="/admin/users" icon={<Users className="w-4 h-4"/>} onClose={onClose}>Clients</Item>
              <Item to="/admin/tools-pricing" icon={<Settings className="w-4 h-4"/>} onClose={onClose}>Tools Pricing</Item>
              <Item to="/analytics" icon={<BarChart3 className="w-4 h-4"/>} onClose={onClose}>Analytics</Item>
            </>
          )}
        </nav>
      </aside>
    </div>
  )
}

function Item({ to, icon, children, onClose }: { to: string; icon: React.ReactNode; children: React.ReactNode; onClose: () => void }) {
  return (
    <NavLink to={to} onClick={onClose} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-800 ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>
      {icon}
      {children}
    </NavLink>
  )
}
