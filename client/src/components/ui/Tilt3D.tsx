import { useRef, useState, type HTMLAttributes } from 'react'

export default function Tilt3D({ depth = 12, className = '', children, ...rest }: { depth?: number } & HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<{ transform?: string; transition?: string }>({})

  function onMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const midX = rect.width / 2
    const midY = rect.height / 2
    const rx = ((y - midY) / midY) * depth
    const ry = ((x - midX) / midX) * -depth
    setStyle({ transform: `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`, transition: 'transform 60ms linear' })
  }
  function onLeave() {
    setStyle({ transform: 'rotateX(0) rotateY(0) translateZ(0)', transition: 'transform 200ms ease' })
  }

  return (
    <div className={`relative [perspective:1000px] ${className}`} {...rest}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="[transform-style:preserve-3d] will-change-transform"
        style={style}
      >
        {children}
      </div>
    </div>
  )
}
