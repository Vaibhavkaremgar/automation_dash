// import React from 'react'

export default function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div className="inline-flex items-center justify-center" role="status" aria-label="loading">
      <svg className="animate-spin text-cyan-400" width={size} height={size} viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>
  )
}
