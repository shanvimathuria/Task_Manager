import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getFavoriteProjects, getRecentProjects, listProjects } from '../api/projects'
import { getTasks } from '../api/tasks'

const AppContext = createContext(null)

import { API_URL } from '../config'

const API_BASE = `${API_URL}/api/auth`

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [isAuthenticated, setIsAuthenticated] = useState(!!token)
  const [isLoading, setIsLoading] = useState(true)

  const [theme, setTheme] = useState('dark')
  const [accentIntensity, setAccentIntensity] = useState(100)
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    deadlines: true,
    mentions: true,
    weeklyDigest: false,
  })
  const [favoriteProjects, setFavoriteProjects] = useState([])
  const [recentProjects, setRecentProjects] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const refreshProjects = useCallback(async () => {
    if (!token) {
      setProjects([])
      setFavoriteProjects([])
      setRecentProjects([])
      setProjectsLoading(false)
      return
    }

    setProjectsLoading(true)
    try {
      const [allProjects, favorites, recent] = await Promise.all([listProjects(), getFavoriteProjects(), getRecentProjects()])
      setProjects(allProjects)
      setFavoriteProjects(favorites)
      setRecentProjects(recent)
    } catch (error) {
      console.error('Error fetching projects:', error)
      setProjects([])
      setFavoriteProjects([])
      setRecentProjects([])
    } finally {
      setProjectsLoading(false)
    }
  }, [token])

  const refreshTasks = useCallback(async () => {
    if (!token) {
      setTasks([])
      setTasksLoading(false)
      return
    }

    setTasksLoading(true)
    try {
      const allTasks = await getTasks()
      setTasks(allTasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setTasks([])
    } finally {
      setTasksLoading(false)
    }
  }, [token])

  // Check token on mount and fetch user profile
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        const res = await fetch(`${API_BASE}/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const userData = await res.json()
          setProfile(userData)
          setIsAuthenticated(true)
        } else {
          // Invalid token
          logout()
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUser()
  }, [token])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects, isAuthenticated])

  useEffect(() => {
    refreshTasks()
  }, [refreshTasks, isAuthenticated])

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok) {
        setToken(data.access_token)
        localStorage.setItem('token', data.access_token)
        
        // Fetch user profile immediately
        const userRes = await fetch(`${API_BASE}/me`, {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        })
        if (userRes.ok) {
          const userData = await userRes.json()
          setProfile(userData)
        }
        
        setIsAuthenticated(true)
        addToast('Login successful', 'success')
        return true
      } else {
        addToast(data.detail || 'Login failed', 'warning')
        return false
      }
    } catch (err) {
      addToast('Network error during login', 'warning')
      return false
    }
  }

  const register = async (name, email, password, avatar = 'U') => {
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, avatar })
      })
      const data = await res.json()
      if (res.ok) {
        setToken(data.access_token)
        localStorage.setItem('token', data.access_token)
        
        // Fetch user profile immediately
        const userRes = await fetch(`${API_BASE}/me`, {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        })
        if (userRes.ok) {
          const userData = await userRes.json()
          setProfile(userData)
        }
        
        setIsAuthenticated(true)
        addToast('Registration successful', 'success')
        return true
      } else {
        addToast(data.detail || 'Registration failed', 'warning')
        return false
      }
    } catch (err) {
      addToast('Network error during registration', 'warning')
      return false
    }
  }

  const logout = useCallback(() => {
    setToken(null)
    setProfile(null)
    setIsAuthenticated(false)
    localStorage.removeItem('token')
    addToast('Logged out successfully', 'info')
  }, [addToast])

  const updateProfile = useCallback((updates) => {
    setProfile((prev) => ({ ...prev, ...updates }))
    addToast('Profile updated successfully', 'success')
  }, [addToast])

  const updateNotifications = useCallback((key, value) => {
    setNotifications((prev) => ({ ...prev, [key]: value }))
    addToast('Notification preferences saved', 'success')
  }, [addToast])

  const updateFavoriteProjects = useCallback(async () => {
    await refreshProjects()
  }, [refreshProjects])

  return (
    <AppContext.Provider
      value={{
        profile,
        user: profile,
        authToken: token,
        token,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        theme,
        accentIntensity,
        notifications,
        favoriteProjects,
        recentProjects,
        projects,
        tasks,
        projectsLoading,
        tasksLoading,
        toasts,
        setTheme,
        setAccentIntensity,
        updateProfile,
        updateNotifications,
        refreshProjects,
        refreshTasks,
        updateFavoriteProjects,
        addToast,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
