import { motion } from 'framer-motion'

export default function AIBackground() {
  const aiIcons = ['🤖', '⚡', '🧠', '💫', '🔮', '✨', '🚀', '💎', '🌟', '⭐', '🔥', '💡']
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Floating AI Icons */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl opacity-10"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          animate={{
            x: [
              Math.random() * window.innerWidth,
              Math.random() * window.innerWidth,
              Math.random() * window.innerWidth,
            ],
            y: [
              Math.random() * window.innerHeight,
              Math.random() * window.innerHeight,
              Math.random() * window.innerHeight,
            ],
            rotate: [0, 360],
          }}
          transition={{
            duration: 20 + Math.random() * 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 5,
          }}
        >
          {aiIcons[i % aiIcons.length]}
        </motion.div>
      ))}
      
      {/* Animated Grid */}
      <div className="absolute inset-0 opacity-5">
        <motion.div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
          animate={{
            backgroundPosition: ['0px 0px', '50px 50px'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
      
      {/* Gradient Orbs */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${
              ['rgba(99, 102, 241, 0.1)', 'rgba(6, 182, 212, 0.1)', 'rgba(139, 92, 246, 0.1)', 'rgba(16, 185, 129, 0.1)', 'rgba(245, 101, 101, 0.1)'][i]
            }, transparent)`,
            width: `${200 + Math.random() * 200}px`,
            height: `${200 + Math.random() * 200}px`,
          }}
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          animate={{
            x: [
              Math.random() * window.innerWidth,
              Math.random() * window.innerWidth,
              Math.random() * window.innerWidth,
            ],
            y: [
              Math.random() * window.innerHeight,
              Math.random() * window.innerHeight,
              Math.random() * window.innerHeight,
            ],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  )
}