import { useLocation } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import './PlaceholderPage.css'

const titles = {
  '/projects': 'Projects',
  '/tasks': 'My Tasks',
  '/team': 'Team',
}

export default function PlaceholderPage() {
  const { pathname } = useLocation()
  const title = titles[pathname] || 'Page'

  return (
    <div className="placeholder-page">
      <header className="page-header">
        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__subtitle">This section is coming soon. Explore the Dashboard and Analytics in the meantime.</p>
      </header>
      <GlassCard className="placeholder-card">
        <span className="placeholder-card__icon">◈</span>
        <p>Frontend-only preview — connect your API when ready.</p>
      </GlassCard>
    </div>
  )
}
