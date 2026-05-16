import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Sidebar from './Sidebar'
import CursorGlow from './CursorGlow'
import ToastNotifications from './ToastNotifications'
import NorthwindLogo from './NorthwindLogo'
import MarqueeFooter from './MarqueeFooter'
import './Layout.css'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { accentIntensity, theme } = useApp()

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-intensity', accentIntensity / 100)
    document.documentElement.dataset.theme = theme
  }, [accentIntensity, theme])

  return (
    <div className="layout">
      <CursorGlow />
      <ToastNotifications />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="layout__main">
        <header className="layout__mobile-header">
          <button
            type="button"
            className="layout__menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <span /><span /><span />
          </button>
          <div className="layout__mobile-brand">
            <NorthwindLogo className="layout__mobile-logo" />
            <span className="layout__mobile-title">Northwind</span>
          </div>
        </header>
        <main className="layout__content">
          <Outlet />
        </main>
        <MarqueeFooter />
      </div>
    </div>
  )
}
