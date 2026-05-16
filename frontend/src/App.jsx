import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Tasks from './pages/Tasks'
import TeamDashboard from './pages/TeamDashboard'
import ProjectWorkspace from './pages/ProjectWorkspace'
import Chat from './pages/Chat'
import Login from './pages/Login'
import Register from './pages/Register'

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useApp()

  if (isLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<Projects />} />
              <Route path="projects/:id/workspace" element={<ProjectWorkspace />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="tasks/:id" element={<Tasks />} />
              <Route path="team" element={<TeamDashboard />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="chat" element={<Chat />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
