import { useState } from 'react'
import { useApp } from '../context/AppContext'
import GlassCard from '../components/GlassCard'
import MagneticButton from '../components/MagneticButton'
import './Settings.css'

export default function Settings() {
  const {
    profile,
    theme,
    accentIntensity,
    notifications,
    setTheme,
    setAccentIntensity,
    updateProfile,
    updateNotifications,
    addToast,
  } = useApp()

  const [form, setForm] = useState({
    name: profile.name,
    username: profile.username,
    email: profile.email,
  })

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    updateProfile(form)
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1 className="page-header__title">Settings</h1>
        <p className="page-header__subtitle">Manage your profile, appearance, and notification preferences.</p>
      </header>

      <div className="settings-grid">
        <GlassCard className="settings-card">
          <h2>Profile</h2>
          <form className="settings-form" onSubmit={handleProfileSubmit}>
            <label>
              <span>Display name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              <span>Username</span>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <MagneticButton type="submit" variant="primary">
              Save Profile
            </MagneticButton>
          </form>
        </GlassCard>

        <GlassCard className="settings-card">
          <h2>Appearance</h2>
          <div className="settings-group">
            <span className="settings-label">Theme</span>
            <div className="theme-toggle">
              {['dark', 'light'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`theme-toggle__btn ${theme === t ? 'theme-toggle__btn--active' : ''}`}
                  onClick={() => {
                    setTheme(t)
                    addToast(`Theme set to ${t}`, 'info')
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-group">
            <span className="settings-label">Accent intensity</span>
            <input
              type="range"
              min="50"
              max="150"
              value={accentIntensity}
              onChange={(e) => setAccentIntensity(Number(e.target.value))}
              className="settings-range"
            />
            <span className="settings-range-val">{accentIntensity}%</span>
          </div>
        </GlassCard>

        <GlassCard className="settings-card settings-card--wide">
          <h2>Notifications</h2>
          <ul className="toggle-list">
            {[
              { key: 'email', label: 'Email notifications', desc: 'Receive updates via email' },
              { key: 'push', label: 'Push notifications', desc: 'Browser and desktop alerts' },
              { key: 'deadlines', label: 'Deadline reminders', desc: 'Alerts before due dates' },
              { key: 'mentions', label: 'Mentions', desc: 'When someone mentions you' },
              { key: 'weeklyDigest', label: 'Weekly digest', desc: 'Summary every Monday' },
            ].map((item) => (
              <li key={item.key} className="toggle-item">
                <div>
                  <span className="toggle-item__label">{item.label}</span>
                  <span className="toggle-item__desc">{item.desc}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifications[item.key]}
                  className={`toggle ${notifications[item.key] ? 'toggle--on' : ''}`}
                  onClick={() => updateNotifications(item.key, !notifications[item.key])}
                >
                  <span className="toggle__thumb" />
                </button>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </div>
  )
}

