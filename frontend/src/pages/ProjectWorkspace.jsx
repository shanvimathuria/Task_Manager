import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getProject, getProjectMembers } from '../api/projects'
import { getProjectTasks } from '../api/tasks'
import './ProjectWorkspace.css'

function formatDisplayDate(value) {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No due date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getMemberInitial(member) {
  if (member?.avatar) return member.avatar
  if (member?.name) return member.name.split(' ').map((p) => p.charAt(0).toUpperCase()).slice(0, 2).join('')
  return 'U'
}

export default function ProjectWorkspace() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast, profile } = useApp()

  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [p, m, t] = await Promise.all([getProject(id), getProjectMembers(id), getProjectTasks(id)])
        setProject(p)
        setMembers(m || [])
        setTasks(t || [])
      } catch (err) {
        addToast(err.message || 'Failed loading project', 'warning')
      } finally {
        setLoading(false)
      }
    }
    if (id) load()
  }, [id, addToast])

  const myTasks = useMemo(() => tasks.filter((task) => task.assigned_to === profile?.id), [tasks, profile])
  const overdue = useMemo(() => tasks.filter((task) => task.due_date && task.status !== 'Done' && new Date(task.due_date).getTime() < Date.now()), [tasks])
  const upcoming = useMemo(() => tasks.filter((task) => task.due_date && task.status !== 'Done' && new Date(task.due_date).getTime() >= Date.now()).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)), [tasks])
  const activity = useMemo(() => tasks.slice(0, 8), [tasks])

  if (loading) return <div className="project-workspace page-loading">Loading workspace…</div>

  if (!project) return (
    <div className="project-workspace project-workspace--empty">
      <p>Project not found.</p>
      <button className="projects-page__btn projects-page__btn--ghost" onClick={() => navigate('/projects')}>Back to projects</button>
    </div>
  )

  return (
    <div className="project-workspace">
      <header className="project-workspace__header">
        <div>
          <h1 className="project-workspace__title">{project.title}</h1>
          <p className="project-workspace__subtitle">{project.description || 'No description provided.'}</p>
          <div className="project-workspace__meta">
            <div><small>Due</small><strong>{formatDisplayDate(project.due_date)}</strong></div>
            <div><small>Status</small><strong>{project.is_active === false ? 'Closed' : 'Active'}</strong></div>
          </div>
        </div>

        <div className="project-workspace__actions">
          <button type="button" className="projects-page__btn projects-page__btn--ghost" onClick={() => addToast('Team chat UI only (coming soon).', 'info')}>Start Team Chat</button>
          <button type="button" className="projects-page__btn projects-page__btn--primary" onClick={() => window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer')}>Create Google Meet</button>
        </div>
      </header>

      <main className="project-workspace__grid">
        <section className="pw-card pw-overview">
          <h3>Overview</h3>
          <p>{project.description || 'No description.'}</p>
          <div className="pw-progress">
            <div className="progress-bar progress-bar--wide"><div className="progress-bar__fill" style={{ width: `${Math.round((tasks.filter((t) => t.status === 'Done').length / (tasks.length || 1)) * 100)}%` }} /></div>
            <div className="pw-stats">
              <span>{tasks.length} tasks</span>
              <span>{members.length} members</span>
              <span>{tasks.filter((t) => t.status === 'Done').length} done</span>
            </div>
          </div>
        </section>

        <section className="pw-card pw-my-tasks">
          <h3>Your tasks</h3>
          {myTasks.length > 0 ? myTasks.map((task) => (
            <div key={task.id} className="workspace-task-item"><strong>{task.title}</strong><span>{task.status} · {formatDisplayDate(task.due_date)}</span></div>
          )) : <p className="workspace-empty-copy">No tasks assigned to you.</p>}
        </section>

        <section className="pw-card pw-members">
          <h3>Members</h3>
          {members.length > 0 ? members.map((m) => (
            <div key={m.user_id} className="member-row"><div className="member-row__avatar">{getMemberInitial(m)}</div><div className="member-row__body"><div className="member-row__head"><strong>{m.name || m.user_id}</strong><span>{m.role}</span></div></div></div>
          )) : <p className="workspace-empty-copy">No members yet.</p>}
        </section>

        <section className="pw-card pw-activity">
          <h3>Recent activity</h3>
          {activity.length > 0 ? activity.map((t) => (
            <div key={t.id} className="workspace-activity-row"><div><strong>{t.title}</strong><span>{t.assigned_name || 'Unassigned'} · {t.status}</span></div><span className="activity-time">{new Date(t.updated_at || t.created_at).toLocaleString()}</span></div>
          )) : <p className="workspace-empty-copy">No recent activity.</p>}
        </section>

        <section className="pw-card pw-deadlines">
          <h3>Deadlines</h3>
          <div><strong>Overdue</strong>{overdue.length > 0 ? overdue.map((t) => (<div key={t.id} className="workspace-deadline-item workspace-deadline-item--warning"><span>{t.title}</span><span>{formatDisplayDate(t.due_date)}</span></div>)) : <p className="workspace-empty-copy">No overdue tasks.</p>}</div>
          <div style={{ marginTop: 12 }}><strong>Upcoming</strong>{upcoming.length > 0 ? upcoming.slice(0, 6).map((t) => (<div key={t.id} className="workspace-deadline-item"><span>{t.title}</span><span>{formatDisplayDate(t.due_date)}</span></div>)) : <p className="workspace-empty-copy">No upcoming deadlines.</p>}</div>
        </section>
      </main>
    </div>
  )
}
