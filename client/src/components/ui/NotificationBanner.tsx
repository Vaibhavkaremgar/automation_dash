import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api'

interface Notification {
  id: number
  type: string
  message: string
  data: any
  created_at: string
}

export default function NotificationBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000) // Check every 10s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Auto-dismiss notifications after 10 minutes
    notifications.forEach(notification => {
      const createdAt = new Date(notification.created_at).getTime()
      const now = new Date().getTime()
      const tenMinutes = 10 * 60 * 1000
      
      if (now - createdAt >= tenMinutes) {
        dismissNotification(notification.id)
      }
    })
  }, [notifications])

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/wallet/notifications')
      setNotifications(response.data.notifications || [])
    } catch (error) {
      // Silently fail - notifications are not critical
      setNotifications([])
    }
  }

  const dismissNotification = async (id: number) => {
    try {
      await api.patch(`/api/wallet/notifications/${id}/read`)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (error) {
      console.error('Failed to dismiss notification:', error)
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-gradient-to-r from-green-600/90 to-emerald-600/90 backdrop-blur-md border border-green-400/30 rounded-lg p-4 shadow-xl max-w-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-400/20 rounded-full flex items-center justify-center">
                    <span className="text-lg">💰</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {notification.message}
                  </p>
                  {notification.data?.amount && (
                    <p className="text-xs text-green-200 mt-1">
                      +₹{notification.data.amount} added
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="text-green-200 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}