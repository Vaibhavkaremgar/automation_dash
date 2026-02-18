import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface FABAction {
  icon: string
  label: string
  onClick: () => void
  color?: string
}

interface FloatingActionButtonProps {
  actions: FABAction[]
}

export default function FloatingActionButton({ actions }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute bottom-16 right-0 space-y-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                onClick={() => {
                  action.onClick()
                  setIsOpen(false)
                }}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-full shadow-lg
                  bg-slate-800/90 backdrop-blur-xl border border-slate-700/50
                  text-white hover:bg-slate-700/90 transition-all
                  ${action.color || 'hover:border-cyan-400'}
                `}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, x: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-lg">{action.icon}</span>
                <span className="font-medium whitespace-nowrap">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 
                   shadow-lg hover:shadow-xl text-white text-xl font-bold
                   flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        +
      </motion.button>
    </div>
  )
}