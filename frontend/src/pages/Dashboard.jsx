import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { toggleProjectFavorite } from '../api/projects'
import { updateTaskStatus } from '../api/tasks'
import './Dashboard.css'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

const projectPalette = ['#7ec8c8', '#c98a7a', '#8ba4c4', '#98a88c', '#d4a574']
const projectHealth = ['good', 'at_risk', 'on_track']

function hashText(text = '') {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function getProjectVisual(project) {
  const seed = hashText(project.title || project.id || '')
  return {
    color: projectPalette[seed % projectPalette.length],
    health: projectHealth[seed % projectHealth.length],
    progress: 30 + (seed % 60),
  }
}

function formatDueDate(value) {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No due date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function safeDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatRelativeTime(value) {
  const date = safeDate(value)
  if (!date) return 'just now'

  const deltaMs = date.getTime() - Date.now()
  const absDelta = Math.abs(deltaMs)
  const minutes = Math.round(absDelta / 60000)
  const hours = Math.round(absDelta / 3600000)
  const days = Math.round(absDelta / 86400000)

  if (minutes < 60) return deltaMs <= 0 ? `${Math.max(minutes, 1)}m ago` : `in ${Math.max(minutes, 1)}m`
  if (hours < 24) return deltaMs <= 0 ? `${Math.max(hours, 1)}h ago` : `in ${Math.max(hours, 1)}h`
  return deltaMs <= 0 ? `${Math.max(days, 1)}d ago` : `in ${Math.max(days, 1)}d`
}

function formatSignedCount(value, suffix) {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value} ${suffix}`
}

function buildDailySeries(items, dateKey, transform = () => 1) {
  const today = new Date()
  const labels = []
  const counts = []

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today)
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - offset)
    labels.push(day.toDateString())
    counts.push(0)
  }

  items.forEach((item) => {
    const date = safeDate(item[dateKey])
    if (!date) return
    date.setHours(0, 0, 0, 0)
    const index = labels.indexOf(date.toDateString())
    if (index >= 0) {
      counts[index] += transform(item)
    }
  })

  return counts
}

function getTaskAvatar(task) {
  const name = task.assigned_name || task.creator_name || task.project_title || 'U'
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || 'U'
}

function getMemberInitial(member) {
  if (member?.avatar) return member.avatar
  if (!member?.name) return 'U'
  return member.name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

const Sparkline = ({ data, color }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="sparkline">
      <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default function Dashboard() {
  const { profile, addToast, favoriteProjects, projects, projectsLoading, refreshProjects, refreshTasks, tasks, tasksLoading } = useApp()
  const navigate = useNavigate()
  const greeting = useMemo(() => getGreeting(), [])
  const today = useMemo(() => formatDate(), [])

  const userName = profile?.name || 'User'
  const dashboardData = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const sevenDaysAgo = new Date(startOfToday)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const fourteenDaysAgo = new Date(startOfToday)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)

    const activeTasks = tasks.filter((task) => task.status !== 'Done')
    const completedTasks = tasks.filter((task) => task.status === 'Done')
    const overdueTasks = tasks.filter((task) => {
      const dueDate = safeDate(task.due_date)
      return dueDate && dueDate < now && task.status !== 'Done'
    })
    const reviewTasks = tasks.filter((task) => task.status === 'In Review')

    const dueSoonTasks = tasks
      .filter((task) => {
        const dueDate = safeDate(task.due_date)
        return dueDate && dueDate >= now && dueDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) && task.status !== 'Done'
      })
      .sort((left, right) => {
        const leftDate = safeDate(left.due_date)
        const rightDate = safeDate(right.due_date)
        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0)
      })

    const recentTasks = [...tasks]
      .sort((left, right) => {
        const leftDate = safeDate(left.updated_at)
        const rightDate = safeDate(right.updated_at)
        return (rightDate?.getTime() || 0) - (leftDate?.getTime() || 0)
      })
      .slice(0, 5)

    const memberMap = new Map()
    projects.forEach((project) => {
      (project.members || []).forEach((member) => {
        if (!memberMap.has(member.user_id)) {
          memberMap.set(member.user_id, {
            id: member.user_id,
            name: member.name || 'Unknown',
            avatar: member.avatar || 'U',
            role: member.role || 'member',
            tasks: [],
          })
        }
      })
    })

    tasks.forEach((task) => {
      if (task.assigned_to && memberMap.has(task.assigned_to)) {
        memberMap.get(task.assigned_to).tasks.push(task)
      }
    })

    const teamPulse = [...memberMap.values()]
      .map((member) => {
        const latestTask = [...member.tasks].sort((left, right) => {
          const leftDate = safeDate(left.updated_at)
          const rightDate = safeDate(right.updated_at)
          return (rightDate?.getTime() || 0) - (leftDate?.getTime() || 0)
        })[0]
        const lastUpdated = safeDate(latestTask?.updated_at)
        const activeWithinDay = lastUpdated ? now.getTime() - lastUpdated.getTime() <= 24 * 60 * 60 * 1000 : false
        return {
          id: member.id,
          name: member.name,
          role: member.role,
          avatar: member.avatar,
          status: activeWithinDay ? 'online' : 'away',
          load: Math.min(95, 30 + member.tasks.length * 12),
          currentTask: latestTask?.title || 'No assigned task',
        }
      })
      .sort((left, right) => right.load - left.load)
      .slice(0, 4)

    const createdThisWeek = tasks.filter((task) => {
      const createdAt = safeDate(task.created_at)
      return createdAt && createdAt >= sevenDaysAgo
    })
    const createdPreviousWeek = tasks.filter((task) => {
      const createdAt = safeDate(task.created_at)
      return createdAt && createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo
    })
    const completedThisWeek = tasks.filter((task) => {
      const completedAt = safeDate(task.completed_at)
      return completedAt && completedAt >= sevenDaysAgo
    })
    const completedPreviousWeek = tasks.filter((task) => {
      const completedAt = safeDate(task.completed_at)
      return completedAt && completedAt >= fourteenDaysAgo && completedAt < sevenDaysAgo
    })

    const stats = [
      {
        id: 'active',
        label: 'Active Tasks',
        value: activeTasks.length,
        trend: formatSignedCount(createdThisWeek.length - createdPreviousWeek.length, 'this week'),
        color: '#7ec8c8',
        sparkline: buildDailySeries(tasks.filter((task) => task.status !== 'Done'), 'created_at'),
      },
      {
        id: 'completed',
        label: 'Completed',
        value: completedTasks.length,
        trend: formatSignedCount(completedThisWeek.length - completedPreviousWeek.length, 'this week'),
        color: '#8fbc8f',
        sparkline: buildDailySeries(tasks.filter((task) => task.status === 'Done'), 'completed_at'),
      },
      {
        id: 'overdue',
        label: 'Overdue',
        value: overdueTasks.length,
        trend: `${overdueTasks.filter((task) => String(task.priority || '').toLowerCase() === 'urgent').length} urgent`,
        color: '#c98a7a',
        sparkline: buildDailySeries(overdueTasks, 'due_date'),
      },
      {
        id: 'review',
        label: 'In Review',
        value: reviewTasks.length,
        trend: `${reviewTasks.filter((task) => safeDate(task.updated_at) && safeDate(task.updated_at) >= sevenDaysAgo).length} pending`,
        color: '#d4a574',
        sparkline: buildDailySeries(reviewTasks, 'updated_at'),
      },
    ]

    const notifications = []
    if (overdueTasks.length > 0) {
      notifications.push({ id: 'overdue', text: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}`, type: 'warning' })
    }
    if (dueSoonTasks.length > 0) {
      notifications.push({ id: 'due-soon', text: `${dueSoonTasks.length} task${dueSoonTasks.length === 1 ? '' : 's'} due soon`, type: 'success' })
    }
    if (completedThisWeek.length > 0) {
      notifications.push({ id: 'completed', text: `${completedThisWeek.length} tasks completed this week`, type: 'info' })
    }

    const activity = recentTasks.map((task) => {
      const completedAt = safeDate(task.completed_at)
      const createdAt = safeDate(task.created_at)
      const updatedAt = safeDate(task.updated_at)
      let action = 'updated'
      let actor = task.assigned_name || task.creator_name || 'Team'

      if (completedAt) {
        action = 'completed'
      } else if (createdAt && updatedAt && updatedAt.getTime() - createdAt.getTime() < 60 * 1000) {
        action = 'created'
        actor = task.creator_name || 'Team'
      } else if (task.assigned_name) {
        action = 'assigned'
        actor = task.creator_name || task.assigned_name
      }

      return {
        id: task.id,
        user: actor.split(' ')[0],
        avatar: getTaskAvatar(task),
        action,
        target: task.title,
        time: formatRelativeTime(task.completed_at || task.updated_at || task.created_at),
        project: task.project_title || 'Project',
      }
    })

    const productivity = {
      insight: tasks.length > 0
        ? `Team velocity is ${activeTasks.length <= overdueTasks.length ? 'slowing' : 'steady'}. ${teamPulse.length} members active.`
        : 'No live task activity yet.',
    }

    const deadlines = dueSoonTasks.slice(0, 4).map((task, index) => ({
      id: task.id,
      title: task.title,
      when: task.due_date
        ? `${formatDueDate(task.due_date)} · ${safeDate(task.due_date)?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
        : 'No due date',
      project: task.project_title || 'Project',
      tag: task.priority || 'TASK',
      urgent: String(task.priority || '').toLowerCase() === 'urgent' || index === 0,
    }))

    return {
      stats,
      notifications,
      teamOnline: teamPulse,
      deadlines,
      activity,
      productivity,
    }
  }, [projects, tasks])
  const taskGroups = useMemo(() => {
    const buckets = {
      'To Do': [],
      'In Progress': [],
      'In Review': [],
      'Done': [],
    }

    tasks.forEach((task) => {
      if (buckets[task.status]) {
        buckets[task.status].push(task)
      }
    })

    return buckets
  }, [tasks])

  const handleFavoriteToggle = async (project, event) => {
    event.stopPropagation()
    try {
      await toggleProjectFavorite(project.id)
      await refreshProjects()
      addToast(project.is_favorite ? 'Removed from favorites' : 'Added to favorites', 'info')
    } catch (error) {
      addToast(error.message, 'warning')
    }
  }

  const handleStatusDrop = async (task, status) => {
    try {
      await updateTaskStatus(task.id, status)
      await refreshTasks()
      addToast(`Moved ${task.title} to ${status}`, 'success')
    } catch (error) {
      addToast(error.message, 'warning')
    }
  }

  return (
    <div className="dash">
      <header className="dash-header">
        <div>
          <h1 className="dash-header__title">{greeting}, {userName}</h1>
          <p className="dash-header__date">{today}</p>
        </div>
        <div className="dash-header__actions">
          {dashboardData.notifications.map((n) => (
            <div key={n.id} className={`nw-badge nw-badge--${n.type}`} title={n.text}>
              <span className="nw-badge__dot"></span>
            </div>
          ))}
          <button type="button" className="nw-btn nw-btn--primary" onClick={() => navigate('/projects', { state: { openCreate: true } })}>
            + New Project
          </button>
          <div className="dash-header__avatar" title={userName}>
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Analytics Overview */}
      <section className="analytics-row">
        {dashboardData.stats.map((s) => (
          <div key={s.id} className="nw-card nw-card--stat">
            <div className="stat__top">
              <span className="stat__label">{s.label}</span>
              <span className="stat__trend" style={{ color: s.color }}>{s.trend}</span>
            </div>
            <div className="stat__bottom">
              <span className="stat__value">{s.value}</span>
              <div className="stat__chart">
                <Sparkline data={s.sparkline} color={s.color} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="dash-grid-dense">
        {/* Left Column: My Tasks & Projects */}
        <div className="dash-col dash-col--main">
          {/* My Tasks */}
          <section className="nw-card nw-card--tasks">
            <div className="nw-card__row">
              <h2 className="nw-card__title">My Tasks</h2>
              <button type="button" className="nw-link" onClick={() => navigate('/tasks')}>View Board</button>
            </div>
            <div className="kanban">
              {Object.entries(taskGroups).map(([status, statusTasks]) => (
                <div key={status} className="kanban__col">
                  <span className="kanban__col-title">{status}</span>
                  <div className="kanban__cards">
                    {tasksLoading ? (
                      <div className="kanban__card">
                        <p className="kanban__card-title">Loading tasks...</p>
                      </div>
                    ) : statusTasks.map(task => (
                      <div
                        key={task.id}
                        className={`kanban__card ${String(task.priority || '').toLowerCase() === 'urgent' ? 'kanban__card--featured' : ''}`}
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData('task-id', task.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={async (event) => {
                          event.preventDefault()
                          const draggedTaskId = event.dataTransfer.getData('task-id')
                          if (!draggedTaskId || draggedTaskId === task.id) return
                          const draggedTask = tasks.find((item) => item.id === draggedTaskId)
                          if (draggedTask) {
                            await handleStatusDrop(draggedTask, status)
                          }
                        }}
                      >
                        <div className="kanban__card-top">
                          <span className={`task-badge task-badge--${String(task.priority || '').toLowerCase()}`}>{task.priority}</span>
                          <span className="kanban__card-id">{task.project_title || task.project_id}</span>
                        </div>
                        <p className="kanban__card-title">{task.title}</p>
                        <span className="nw-tag">{task.assigned_name || 'Unassigned'}</span>
                      </div>
                    ))}
                    <button type="button" className="kanban__add" onClick={() => navigate('/tasks', { state: { createTask: true, status } })}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Favorite Projects */}
          <section className="nw-card nw-card--projects">
            <div className="nw-card__row">
              <h2 className="nw-card__title">Favorite Projects</h2>
              <button type="button" className="nw-link" onClick={() => navigate('/projects')}>View All</button>
            </div>
            <div className="project-grid">
              {projectsLoading ? (
                <div className="projects-empty projects-empty--dashboard">Loading projects...</div>
              ) : favoriteProjects.length === 0 ? (
                <div className="projects-empty projects-empty--dashboard">
                  <p>No favorite projects yet.</p>
                  <button type="button" className="nw-btn nw-btn--primary" onClick={() => navigate('/projects')}>Open Projects</button>
                </div>
              ) : favoriteProjects.map((project) => {
                const visual = getProjectVisual(project)
                return (
                <div
                  key={project.id}
                  className="project-card project-card--interactive"
                  onClick={() => navigate(`/projects/${project.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(`/projects/${project.id}`)
                    }
                  }}
                >
                  <div className="project-card__top">
                    <div className="project-card__header">
                      <div className="project-card__color" style={{ backgroundColor: visual.color }}></div>
                      <div>
                        <h3 className="project-card__name">{project.title}</h3>
                        <p className="project-card__description">{project.description || 'Live project synced from the backend.'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`project-card__star ${project.is_favorite ? 'project-card__star--active' : ''}`}
                      title={project.is_favorite ? 'Remove favorite' : 'Add favorite'}
                      onClick={(event) => handleFavoriteToggle(project, event)}
                    >
                      ★
                    </button>
                  </div>
                  <div className="project-card__stats">
                    <span>{project.members?.length || 0} members</span>
                    <span className="project-card__dot">•</span>
                    <span>Due {formatDueDate(project.due_date)}</span>
                  </div>
                  <div className="project-card__bottom">
                    <div className="avatar-group">
                      {(project.members || []).slice(0, 3).map((member, index) => (
                        <div key={member.id} className="avatar-mini" style={{ zIndex: (project.members?.length || 0) - index }} title={member.name}>
                          {getMemberInitial(member)}
                        </div>
                      ))}
                    </div>
                    <div className="progress-bar" title={`${visual.progress}% Complete`}>
                      <div className="progress-bar__fill" style={{ width: `${visual.progress}%`, backgroundColor: visual.color }}></div>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Pulse, Deadlines, Activity */}
        <div className="dash-col dash-col--side">
          {/* Pulse */}
          <section className="nw-card nw-card--pulse">
            <div className="nw-card__row">
              <h2 className="nw-card__title">Pulse</h2>
              <span className="live-pill"><span className="live-pill__dot" /> {dashboardData.teamOnline.filter((t) => t.status === 'online').length} Active</span>
            </div>
            <ul className="pulse-list dense">
              {dashboardData.teamOnline.map((m) => (
                <li key={m.id} className="pulse-row">
                  <div className="pulse-row__avatar">{m.avatar}</div>
                  <div className="pulse-row__info">
                    <div className="pulse-row__head">
                      <span className="pulse-row__name">{m.name}</span>
                      {m.status === 'online' ? (
                        <div className="pulse-row__bar" title={`Load: ${m.load}%`}><span style={{ width: `${m.load}%` }} /></div>
                      ) : (
                        <span className="pulse-row__away">Away</span>
                      )}
                    </div>
                    <span className="pulse-row__task">{m.currentTask}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="pulse-foot">{dashboardData.productivity.insight}</p>
          </section>

          {/* Upcoming Deadlines */}
          <section className="nw-card nw-card--chronos">
            <h2 className="nw-card__title">Deadlines</h2>
            <ol className="chronos dense">
              {dashboardData.deadlines.map((d, i) => (
                <li key={d.id} className="chronos__item">
                  <div className="chronos__track">
                    <span className={`chronos__dot ${d.urgent ? 'chronos__dot--urgent' : ''}`} />
                    {i < dashboardData.deadlines.length - 1 && <span className="chronos__line" />}
                  </div>
                  <div className="chronos__body">
                    <div className="chronos__head">
                      <span className="chronos__when">{d.when}</span>
                      {d.urgent && <span className="nw-tag nw-tag--critical">Urgent</span>}
                    </div>
                    <p className="chronos__title">{d.title}</p>
                    <span className="nw-tag">{d.project}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Recent Activity */}
          <section className="nw-card nw-card--activity">
            <h2 className="nw-card__title">Activity</h2>
            <ul className="activity-feed">
              {dashboardData.activity.map((a) => (
                <li key={a.id} className="activity-item">
                  <div className="activity-item__avatar">{a.avatar}</div>
                  <div className="activity-item__body">
                    <p className="activity-item__text">
                      <span className="activity-item__user">{a.user}</span> {a.action} <span className="activity-item__target">{a.target}</span>
                    </p>
                    <div className="activity-item__meta">
                      <span>{a.time}</span>
                      <span className="activity-item__dot">•</span>
                      <span>{a.project}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

