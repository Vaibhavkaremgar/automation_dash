import { memo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import WalletBadge from './WalletBadge'
import { Menu } from 'lucide-react'
import AICube from '../ui/AICube'

export default memo(function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { user, logout } = useAuth()
  const isInsuranceClient = user?.client_type === 'insurance'
  const [selectedVertical, setSelectedVertical] = useState(() => {
    return localStorage.getItem('insuranceVerticalFilter') || 'all'
  })
  
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/60 backdrop-blur flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button className="md:hidden inline-flex items-center justify-center p-2 rounded border border-slate-800 hover:bg-slate-800/60" onClick={onMenu} aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <AICube size={20} />
        <div className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">VB Automations</div>
      </div>
      <div className="flex items-center gap-3">
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
