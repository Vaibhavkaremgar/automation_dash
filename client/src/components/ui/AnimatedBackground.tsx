// import { useEffect, useState } from 'react'

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Deep Space Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950" />
      
      {/* Galaxy Nebula */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 1200px 600px at 30% 40%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 800px 400px at 70% 60%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 600px 300px at 50% 80%, rgba(6, 182, 212, 0.08) 0%, transparent 50%)
          `
        }}
      />

      {/* Twinkling Stars */}
      {Array.from({ length: 100 }).map((_, i) => (
        <div
          key={i}
          className="absolute bg-white rounded-full"
          style={{
            width: Math.random() * 3 + 1 + 'px',
            height: Math.random() * 3 + 1 + 'px',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            opacity: Math.random() * 0.8 + 0.2,
            animation: `twinkle ${Math.random() * 4 + 2}s ease-in-out infinite ${Math.random() * 2}s`
          }}
        />
      ))}

      {/* AI Neural Network */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <linearGradient id="neural" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* Neural connections */}
        <path d="M0,200 Q300,100 600,200 T1200,200" stroke="url(#neural)" strokeWidth="1" fill="none" opacity="0.3">
          <animate attributeName="stroke-dasharray" values="0,1000;1000,0;0,1000" dur="8s" repeatCount="indefinite" />
        </path>
        <path d="M200,0 Q400,300 600,150 T1000,300" stroke="url(#neural)" strokeWidth="1" fill="none" opacity="0.2">
          <animate attributeName="stroke-dasharray" values="0,800;800,0;0,800" dur="10s" repeatCount="indefinite" />
        </path>
        <path d="M100,400 Q500,200 800,400 T1400,400" stroke="url(#neural)" strokeWidth="1" fill="none" opacity="0.25">
          <animate attributeName="stroke-dasharray" values="0,1200;1200,0;0,1200" dur="12s" repeatCount="indefinite" />
        </path>
      </svg>

      {/* Floating AI Particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full opacity-60"
          style={{
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            animation: `float ${Math.random() * 6 + 4}s ease-in-out infinite ${Math.random() * 3}s`
          }}
        />
      ))}

      {/* Cosmic Dust Clouds */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.3) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.2) 0%, transparent 35%),
            radial-gradient(circle at 60% 20%, rgba(6, 182, 212, 0.25) 0%, transparent 45%)
          `,
          animation: 'drift 20s ease-in-out infinite'
        }}
      />

      {/* Subtle Grid */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px'
        }}
      />

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-15px) translateX(10px); }
          50% { transform: translateY(-5px) translateX(-8px); }
          75% { transform: translateY(-20px) translateX(5px); }
        }
        @keyframes drift {
          0%, 100% { transform: translateX(0px) translateY(0px) rotate(0deg); }
          33% { transform: translateX(30px) translateY(-20px) rotate(120deg); }
          66% { transform: translateX(-20px) translateY(15px) rotate(240deg); }
        }
      `}</style>
    </div>
  )
}