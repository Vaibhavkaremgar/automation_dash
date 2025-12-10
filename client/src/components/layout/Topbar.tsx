import { memo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import WalletBadge from './WalletBadge'
import { Menu } from 'lucide-react'
import AICube from '../ui/AICube'

export default memo(function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isInsuranceClient = user?.client_type === 'insurance'
  const [selectedVertical, setSelectedVertical] = useState(() => {
    return localStorage.getItem('insuranceVerticalFilter') || 'all'
  })
  const profileName = localStorage.getItem('selectedProfileName')
  
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/60 backdrop-blur flex items-center justify-between px-2 md:px-4 relative z-20">
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        <button className="md:hidden inline-flex items-center justify-center p-2 rounded border border-slate-800 hover:bg-slate-800/60 flex-shrink-0" onClick={onMenu} aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <AICube size={20} className="hidden sm:block flex-shrink-0" />
        <div className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 text-sm md:text-base truncate">VB Automations</div>
      </div>
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('/profiles')}
          className="px-3 py-1.5 bg-indigo-900/20 border border-indigo-700/50 rounded-lg text-indigo-300 text-sm hover:bg-indigo-900/40 transition-all flex items-center gap-2"
        >
          <span className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">
            {profileName ? profileName.charAt(0).toUpperCase() : '👤'}
          </span>
          {profileName || 'Select Profile'}
        </button>
        
        {isInsuranceClient && (
          <select
            className="px-3 py-1.5 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
            value={selectedVertical}
            onChange={(e) => {
              setSelectedVertical(e.target.value);
              localStorage.setItem('insuranceVerticalFilter', e.target.value);
              const event = new CustomEvent('insuranceVerticalChange', { detail: e.target.value });
              window.dispatchEvent(event);
            }}
          >
            <option value="all">📋 All Insurances</option>
            <option value="motor">🚗 Motor</option>
            <option value="health">🏥 Health</option>
            <option value="non-motor">🏠 Non-Motor</option>
            <option value="life">👤 Life</option>
          </select>
        )}

        <motion.button
          onClick={logout}
          className="px-3 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700/50 hover:border-red-600 rounded-lg text-red-400 hover:text-red-300 text-sm font-medium transition-all duration-200 flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>🚪</span>
          Logout
        </motion.button>
      </div>
    </header>
  )
})
