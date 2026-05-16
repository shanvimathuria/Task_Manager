import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { useApp } from '../context/AppContext'
import './Login.css'

// The Northwind logo extracted from favicon.svg
function NorthwindLogo({ size = 32 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" width={size} height={size}>
      <rect width="32" height="32" rx="8" fill="#141414"/>
      <rect width="32" height="32" rx="8" fill="url(#nw-g)"/>
      <path d="M16 8l6 3v6l-6 3-6-3v-6l6-3z" stroke="#0c0c0c" strokeWidth="1.5" fill="rgba(0,0,0,0.15)"/>
      <path d="M16 14v4M14 16h4" stroke="#0c0c0c" strokeWidth="1.5" strokeLinecap="round"/>
      <defs>
        <linearGradient id="nw-g" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#98A88C"/>
          <stop offset="1" stopColor="#6a7a62"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
    title: 'Project Boards',
    desc: 'Kanban, list, and timeline views for every workflow.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Team Collaboration',
    desc: 'Assign tasks, mention teammates, and track progress together.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'Live Analytics',
    desc: 'Velocity charts, burndown graphs, and team performance insights.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'Built-in Chat',
    desc: 'Conversations live right next to the work — no context switching.',
  },
]

const STATS = [
  { value: '10k+', label: 'Users' },
  { value: '500k+', label: 'Tasks Done' },
  { value: '99.9%', label: 'Uptime' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeFeature, setActiveFeature] = useState(0)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)
  const { login, googleLogin } = useApp()
  const navigate = useNavigate()
  const orbsRef = useRef([])

  // Auto-cycle feature highlights
  useEffect(() => {
    const id = setInterval(() => setActiveFeature(p => (p + 1) % FEATURES.length), 3200)
    return () => clearInterval(id)
  }, [])

  // Subtle parallax on orbs
  useEffect(() => {
    const onMove = (e) => {
      const cx = window.innerWidth * 0.35 // orbs are in the left 70%
      const cy = window.innerHeight / 2
      const dx = (e.clientX - cx) / cx
      const dy = (e.clientY - cy) / cy
      orbsRef.current.forEach((el, i) => {
        if (!el) return
        el.style.transform = `translate(${dx * (i + 1) * 14}px, ${dy * (i + 1) * 14}px)`
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const ok = await login(email, password)
    setLoading(false)
    if (ok) navigate('/')
    else setError('Invalid email or password.')
  }

  const handleGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true)
      setError('')
      const ok = await googleLogin(tokenResponse.access_token)
      setGoogleLoading(false)
      if (ok) navigate('/')
      else setError('Google sign-in failed. Please try again.')
    },
    onError: () => setError('Google sign-in was cancelled or failed.'),
  })

  return (
    <div className="lp-root">
      {/* ══════════ LEFT — 70% showcase ══════════ */}
      <div className="lp-showcase">
        {/* Ambient orbs */}
        <div className="lp-orb lp-orb-1" ref={el => orbsRef.current[0] = el} />
        <div className="lp-orb lp-orb-2" ref={el => orbsRef.current[1] = el} />
        <div className="lp-orb lp-orb-3" ref={el => orbsRef.current[2] = el} />

        <div className="lp-showcase-inner">
          {/* Brand */}
          <div className="lp-brand">
            <NorthwindLogo size={38} />
            <span className="lp-brand-name">Northwind Workspace</span>
          </div>

          {/* Hero */}
          <div className="lp-hero">
            <h1 className="lp-hero-title">
              Your team's work,<br />
              <span className="lp-hero-accent">beautifully organised.</span>
            </h1>
            <p className="lp-hero-sub">
              Northwind Workspace brings projects, tasks, chat, and analytics into one calm, focused environment — so your team can do their best work.
            </p>
          </div>

          {/* Feature grid */}
          <div className="lp-features">
            {FEATURES.map((f, i) => (
              <button
                key={i}
                className={`lp-feat ${i === activeFeature ? 'lp-feat--on' : ''}`}
                onClick={() => setActiveFeature(i)}
              >
                <span className="lp-feat-icon">{f.icon}</span>
                <div>
                  <div className="lp-feat-title">{f.title}</div>
                  <div className="lp-feat-desc">{f.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="lp-stats">
            {STATS.map((s, i) => (
              <div key={i} className="lp-stat">
                <span className="lp-stat-val">{s.value}</span>
                <span className="lp-stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ RIGHT — 30% login form ══════════ */}
      <div className="lp-panel">
        <div className="lp-form-wrap">
          {/* Header */}
          <div className="lp-form-head">
            <div className="lp-logo-ring">
              <NorthwindLogo size={30} />
            </div>
            <h2 className="lp-form-title">Welcome back</h2>
            <p className="lp-form-sub">Sign in to your workspace</p>
          </div>

          {/* Google button */}
          <button
            type="button"
            className={`lp-google-btn ${googleLoading ? 'lp-google-btn--loading' : ''}`}
            onClick={() => handleGoogle()}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <span className="lp-spinner" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="lp-divider"><span>or sign in with email</span></div>

          {/* Error */}
          {error && <div className="lp-error"><span>⚠</span> {error}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit} className="lp-form" noValidate>
            <div className={`lp-field ${emailFocused || email ? 'lp-field--on' : ''}`}>
              <label className="lp-label">Email</label>
              <div className="lp-input-wrap">
                <span className="lp-input-ico">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="2" y="4" width="20" height="16" rx="3"/>
                    <path d="M2 7l10 7 10-7"/>
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  required
                  placeholder="you@example.com"
                  className="lp-input"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={`lp-field ${passFocused || password ? 'lp-field--on' : ''}`}>
              <div className="lp-label-row">
                <label className="lp-label">Password</label>
                <a href="#" className="lp-forgot">Forgot?</a>
              </div>
              <div className="lp-input-wrap">
                <span className="lp-input-ico">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="5" y="11" width="14" height="10" rx="2"/>
                    <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  required
                  placeholder="••••••••"
                  className="lp-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="lp-eye"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide' : 'Show'}
                >
                  {showPassword ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`lp-submit ${loading ? 'lp-submit--loading' : ''}`}
              disabled={loading || googleLoading}
            >
              {loading ? <span className="lp-spinner" /> : 'Sign In'}
            </button>
          </form>

          <p className="lp-register">
            No account?{' '}
            <Link to="/register" className="lp-link">Create one →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
