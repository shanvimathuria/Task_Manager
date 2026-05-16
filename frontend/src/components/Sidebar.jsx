import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import NorthwindLogo from './NorthwindLogo'
import { sidebarIcons } from './icons/SidebarIcons'
import './Sidebar.css'

const mainNav = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/projects', label: 'Projects', icon: 'projects' },
  { to: '/tasks', label: 'My Tasks', icon: 'tasks' },
  { to: '/team', label: 'Team', icon: 'team' },
]

const footerNav = [
  { to: '/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

export default function Sidebar({ open, onClose }) {
  const { logout, recentProjects, projectsLoading, refreshProjects } = useApp()
  const navigate = useNavigate()

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  const handleSignOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'sidebar-overlay--visible' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <NorthwindLogo className="sidebar__brand-mark" />
          <div>
          <span className="sidebar__brand-name">Northwind</span>
          <span className="sidebar__brand-sub">Workspace</span>
          </div>
        </div>

        <nav className="sidebar__main">
          <ul className="sidebar__nav">
            {mainNav.map((item) => {
              const Icon = sidebarIcons[item.icon]
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                    onClick={onClose}
                  >
                    <span className="sidebar__link-icon"><Icon /></span>
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>

          <span className="sidebar__heading">Recent Projects</span>
          <ul className="sidebar__projects">
            {projectsLoading ? <li className="sidebar__project sidebar__project--empty">Loading recent projects...</li> : recentProjects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="sidebar__project"
                onClick={() => {
                  navigate(`/projects/${p.id}/workspace`)
                  onClose()
                }}
              >
                <span className="sidebar__dot" style={{ background: p.members?.length ? '#7ec8c8' : '#8ba4c4' }} />
                {p.title}
              </button>
            </li>
            ))}
            {!projectsLoading && recentProjects.length === 0 ? <li className="sidebar__project sidebar__project--empty">No recent projects</li> : null}
          </ul>
        </nav>

        <div className="sidebar__footer">
          <ul className="sidebar__footer-nav">
            {footerNav.map((item) => {
              const Icon = sidebarIcons[item.icon]
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => `sidebar__footer-link ${isActive ? 'sidebar__footer-link--active' : ''}`}
                    onClick={onClose}
                  >
                    <span className="sidebar__link-icon"><Icon /></span>
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
          <button type="button" className="sidebar__signout" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}

