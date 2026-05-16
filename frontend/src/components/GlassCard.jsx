import './GlassCard.css'

export default function GlassCard({ children, className = '', hover = true, gradient = false }) {
  return (
    <div
      className={`glass-card ${hover ? 'glass-card--hover' : ''} ${gradient ? 'glass-card--gradient' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
