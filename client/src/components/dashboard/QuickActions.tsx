import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnimatedButton from '../ui/AnimatedButton'
import AnimatedCard from '../ui/AnimatedCard'
import { Briefcase, Upload, Users, Wallet } from 'lucide-react'

export default function QuickActions() {
  const actions = [
    {
      icon: Briefcase,
      emoji: '🎯',
      title: 'Job Creator',
      subtitle: 'Smart job posting',
      to: '/jobs',
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-500/10 border-indigo-500/20'
    },
    {
      icon: Upload,
      emoji: '🚀',
      title: 'Resume Upload',
      subtitle: 'Upload & process',
      to: '/upload',
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20'
    },
    {
      icon: Users,
      emoji: '🤖',
      title: 'Candidates',
      subtitle: 'Auto-sync & score',
      to: '/candidates',
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      icon: Wallet,
      emoji: '⚡',
      title: 'Wallet',
      subtitle: 'Power your agents',
      to: '/wallet',
      color: 'from-fuchsia-500 to-pink-500',
      bgColor: 'bg-fuchsia-500/10 border-fuchsia-500/20'
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <motion.div
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          <span className="text-sm">⚡</span>
        </motion.div>
        <h2 className="text-xl font-semibold text-cyan-300">Quick Actions</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <motion.div
            key={action.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <AnimatedCard className={`p-4 group cursor-pointer border ${action.bgColor} hover:border-opacity-40 transition-all duration-300`}>
              <Link to={action.to} className="block">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <action.icon className="w-5 h-5 text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{action.emoji}</span>
                      <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        {action.title}
                      </div>
                    </div>
                    <div className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      {action.subtitle}
                    </div>
                  </div>
                  <motion.div
                    className="text-slate-400 group-hover:text-cyan-400 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    →
                  </motion.div>
                </div>
              </Link>
            </AnimatedCard>
          </motion.div>
        ))}
      </div>
    </div>
  )
}