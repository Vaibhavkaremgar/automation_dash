export default function AICube({ size = 24 }: { size?: number }) {
  const s = `${size}px`
  return (
    <div className="ai-cube" style={{ width: s, height: s }} aria-hidden>
      <div className="cube" style={{ width: s, height: s }}>
        <span className="cube-face cube-front" />
        <span className="cube-face cube-back" />
        <span className="cube-face cube-right" />
        <span className="cube-face cube-left" />
        <span className="cube-face cube-top" />
        <span className="cube-face cube-bottom" />
      </div>
    </div>
  )
}
