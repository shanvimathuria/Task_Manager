import { useRef } from 'react'
import './MagneticButton.css'

export default function MagneticButton({
  children,
  className = '',
  variant = 'primary',
  onClick,
  type = 'button',
  ...props
}) {
  const ref = useRef(null)

  const handleMove = (e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    el.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`
  }

  const handleLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <button
      ref={ref}
      type={type}
      className={`magnetic-btn magnetic-btn--${variant} ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      {...props}
    >
      <span className="magnetic-btn__inner">{children}</span>
    </button>
  )
}
