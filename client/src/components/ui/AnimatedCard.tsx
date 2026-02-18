import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  delay?: number
  hover?: boolean
}

export default function AnimatedCard({ children, className = '', delay = 0, hover = true }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={hover ? { y: -2, transition: { duration: 0.1 } } : undefined}
      className={`
        bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-xl
        shadow-lg hover:shadow-xl transition-all duration-200
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}