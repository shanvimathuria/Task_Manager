import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { getProjectMembers } from '../api/projects'
import { getProjectTasks } from '../api/tasks'
import './TeamDashboard.css'

function ProjectCard({ project, active, onClick }) {
  return (
    <button
      type="button"
      className={`td-project-card ${active ? 'active' : ''}`}
      style={{ color: '#ffffff' }}
      onClick={() => onClick(project.id)}
      aria-pressed={active}
    >
      <div className="td-project-card__title" style={{ color: '#ffffff' }}>{project.title}</div>
      <div className="td-project-card__meta">
        <span style={{ color: 'rgba(255,255,255,0.72)' }}>{project.members?.length || 0} members</span>
        <div className="td-progress">
          <div className="td-progress__bar" style={{ width: `${project._progress || 0}%` }} />
        </div>
      </div>
    </button>
  )
}

export default function TeamDashboard() {
  const { projects, refreshProjects, tasks, refreshTasks, profile } = useApp()
  const [selectedProject, setSelectedProject] = useState(projects[0]?.id || '')
  const [members, setMembers] = useState([])
  const [projectTasks, setProjectTasks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { refreshProjects(); refreshTasks() }, [])

  useEffect(() => {
    if (projects.length && !selectedProject) setSelectedProject(projects[0].id)
  }, [projects])

  useEffect(() => {
    async function loadProjectData() {
      if (!selectedProject) return
      setLoading(true)
      try {
        const [m, t] = await Promise.all([getProjectMembers(selectedProject), getProjectTasks(selectedProject)])
        setMembers(m || [])
        setProjectTasks(t || [])
      } catch (err) {
        setMembers([])
        setProjectTasks([])
      } finally {
        setLoading(false)
      }
    }
    loadProjectData()
  }, [selectedProject])

  const stats = useMemo(() => {
    const total = projectTasks.length
    const assigned = projectTasks.filter(t => t.assigned_to).length
    const completed = projectTasks.filter(t => t.status === 'Done').length
    const overdue = projectTasks.filter(t => t.due_date && new Date(t.due_date) < Date.now() && t.status !== 'Done').length
    const progress = total ? Math.round((completed / total) * 100) : 0
    return { total, assigned, completed, overdue, progress }
  }, [projectTasks])

  const contributors = useMemo(() => {
    const map = {}
    projectTasks.forEach(t => {
      if (t.assigned_to && t.status !== 'Done') map[t.assigned_to] = { id: t.assigned_to, name: t.assigned_name || t.assigned_to, count: (map[t.assigned_to]?.count || 0) + 1 }
    })
    return Object.values(map)
  }, [projectTasks])

  const recentActivity = useMemo(() => {
    return [...projectTasks]
      .sort((a,b)=> new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 8)
  }, [projectTasks])

  // compute small progress per project for the left cards
  const projectsWithProgress = projects.map(p => {
    const projTasks = tasks.filter(t => t.project_id === p.id)
    const completed = projTasks.filter(t => t.status === 'Done').length
    const prog = projTasks.length ? Math.round((completed / projTasks.length) * 100) : 0
    return { ...p, _progress: prog }
  })

  return (
    <div className="team-dashboard">
      <header className="td-hero">
        <div>
          <span className="td-eyebrow">Collaboration</span>
          <h1 className="td-title">Teams</h1>
          <p className="td-sub">A compact collaboration workspace for project members, progress, and activity.</p>
        </div>
        <div className="td-hero-actions">
          <button className="td-btn td-btn--ghost">Invite</button>
          <button className="td-btn td-btn--primary">New Task</button>
        </div>
      </header>

      <div className="td-body">
        <aside className="td-left">
          <div className="td-left__list">
            {projectsWithProgress.map(p => (
              <ProjectCard key={p.id} project={p} active={p.id===selectedProject} onClick={setSelectedProject} />
            ))}
          </div>
        </aside>

        <main className="td-main">
          <section className="td-stats">
            <div className="td-stat">
              <span className="td-stat__label">Total tasks</span>
              <strong className="td-stat__value">{stats.total}</strong>
            </div>
            <div className="td-stat">
              <span className="td-stat__label">Assigned</span>
              <strong className="td-stat__value">{stats.assigned}</strong>
            </div>
            <div className="td-stat">
              <span className="td-stat__label">Completed</span>
              <strong className="td-stat__value">{stats.completed}</strong>
            </div>
            <div className="td-stat">
              <span className="td-stat__label">Overdue</span>
              <strong className="td-stat__value td-stat--danger">{stats.overdue}</strong>
            </div>
            <div className="td-stat td-stat--progress">
              <span className="td-stat__label">Progress</span>
              <div className="td-progress-large">
                <div className="td-progress-large__track" aria-hidden="true">
                  <div className="td-progress-large__bar" style={{ width: `${stats.progress}%` }} />
                </div>
                <span className="td-progress-large__num">{stats.progress}% complete</span>
              </div>
            </div>
          </section>

          <section className="td-members-grid">
            <div className="td-section-head">
              <h3>Members</h3>
              <span>{members.length} joined</span>
            </div>
            <div className="td-members">
              {members.map(m => (
                <div key={m.user_id} className="td-member-card">
                  <div className={`td-status-dot ${m.is_online? 'online':'offline'}`}></div>
                  <div>
                    <strong>{m.name || m.user_id}</strong>
                    <div className="td-member-meta">
                      <span className="td-role">{m.role}</span>
                      <span className="td-count">{projectTasks.filter(t=>t.assigned_to===m.user_id).length} assigned</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="td-activity">
            <div className="td-section-head">
              <h3>Recent activity</h3>
              <span>{recentActivity.length} updates</span>
            </div>
            <ul>
              {recentActivity.map(a => (
                <li key={a.id} className="td-activity-row">
                  <div className="td-activity-left">
                    <strong>{a.title}</strong>
                    <span className="td-activity-meta">{a.assigned_name || 'Unassigned'} · {a.status}</span>
                  </div>
                  <div className="td-activity-right">{new Date(a.updated_at || a.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  )
}
