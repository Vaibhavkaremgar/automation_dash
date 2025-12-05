import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import MobileSidebar from './MobileSidebar'
import LowBalanceBanner from './LowBalanceBanner'
import PasswordChangeModal from '../PasswordChangeModal'
import AnimatedBackground from '../ui/AnimatedBackground'
import AIBackground from '../ui/AIBackground'
import NotificationBanner from '../ui/NotificationBanner'
import SyncIndicator from '../ui/SyncIndicator'
import { useAuth } from '../../context/AuthContext'

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const { user, refreshMe } = useAuth()

  useEffect(() => {
    if (user?.mustChangePassword) {
      setShowPasswordModal(true)
    }
  }, [user?.mustChangePassword])

  const handlePasswordChangeClose = async () => {
    setShowPasswordModal(false)
    await refreshMe() // Refresh user data to check if password was changed
  }

  return (
    <div className="h-screen w-full flex relative overflow-hidden">
      <AnimatedBackground />
      <AIBackground />
      <SyncIndicator />
      
      <Sidebar />
      
      <MobileSidebar open={mobileOpen} onClose={()=>setMobileOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Topbar onMenu={()=>setMobileOpen(true)} />
        

        
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      
      <NotificationBanner />
      
      <AnimatePresence>
        {showPasswordModal && (
          <PasswordChangeModal 
            isOpen={showPasswordModal}
            onClose={handlePasswordChangeClose}
            isTemporary={user?.mustChangePassword}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
