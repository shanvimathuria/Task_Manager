import { analyticsData } from '../data/mockData'
import GlassCard from '../components/GlassCard'
import './Analytics.css'

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const maxBar = Math.max(...analyticsData.weeklyCompletion)

export default function Analytics() {
  return (
    <div className="analytics-page">
      <header className="page-header">
        <h1 className="page-header__title">Analytics</h1>
        <p className="page-header__subtitle">Track productivity and project performance across your workspace.</p>
      </header>

      <div className="analytics-metrics">
        <GlassCard className="metric-card" gradient>
          <span className="metric-card__label">Productivity Score</span>
          <span className="metric-card__value">{analyticsData.productivity}%</span>
          <div className="metric-card__bar">
            <div className="metric-card__fill" style={{ width: `${analyticsData.productivity}%` }} />
          </div>
        </GlassCard>
        <GlassCard className="metric-card">
          <span className="metric-card__label">Avg. Completion Time</span>
          <span className="metric-card__value metric-card__value--sm">{analyticsData.avgCompletion}</span>
        </GlassCard>
        <GlassCard className="metric-card">
          <span className="metric-card__label">Tasks This Week</span>
          <span className="metric-card__value">{analyticsData.tasksThisWeek}</span>
        </GlassCard>
      </div>

      <div className="analytics-grid">
        <GlassCard className="chart-card">
          <h2>Weekly Task Completion</h2>
          <div className="bar-chart">
            {analyticsData.weeklyCompletion.map((val, i) => (
              <div key={days[i]} className="bar-chart__col">
                <div
                  className="bar-chart__bar"
                  style={{ height: `${(val / maxBar) * 100}%` }}
                  title={`${val} tasks`}
                />
                <span className="bar-chart__label">{days[i]}</span>
                <span className="bar-chart__val">{val}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="chart-card">
          <h2>Project Distribution</h2>
          <div className="donut-section">
            <div className="donut-chart" aria-hidden>
              <svg viewBox="0 0 120 120">
                {(() => {
                  let offset = 0
                  const total = analyticsData.projectDistribution.reduce((s, p) => s + p.value, 0)
                  return analyticsData.projectDistribution.map((p) => {
                    const pct = (p.value / total) * 100
                    const dash = `${pct} ${100 - pct}`
                    const el = (
                      <circle
                        key={p.name}
                        cx="60"
                        cy="60"
                        r="48"
                        fill="none"
                        stroke={p.color}
                        strokeWidth="14"
                        strokeDasharray={dash}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 60 60)"
                        opacity="0.9"
                      />
                    )
                    offset += pct
                    return el
                  })
                })()}
              </svg>
            </div>
            <ul className="donut-legend">
              {analyticsData.projectDistribution.map((p) => (
                <li key={p.name}>
                  <span className="donut-legend__dot" style={{ background: p.color }} />
                  <span>{p.name}</span>
                  <span className="donut-legend__pct">{p.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

