import { useEffect, useState } from 'react'
import './CursorGlow.css'

export default function CursorGlow() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY })
      if (!visible) setVisible(true)
    }
    const onLeave = () => setVisible(false)
    window.addEventListener('mousemove', onMove)
    document.body.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.body.removeEventListener('mouseleave', onLeave)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      className="cursor-glow"
      style={{ left: pos.x, top: pos.y }}
      aria-hidden
    />
  )
}
