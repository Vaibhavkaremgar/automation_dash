import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface AnimatedButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  className?: string
}

export default function AnimatedButton({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary',
  className = ''
}: AnimatedButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500',
    secondary: 'bg-slate-700 hover:bg-slate-600',
    danger: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className={`
        px-4 py-2 rounded-lg text-white font-medium
        shadow-lg hover:shadow-xl transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </motion.button>
  )
}