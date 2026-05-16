import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  addProjectMember,
  createProject,
  deleteProject,
  getProjectMembers,
  getProject,
  listProjects,
  removeProjectMember,
  toggleProjectFavorite,
  updateProject,
} from '../api/projects'
import { getProjectTasks } from '../api/tasks'
import './Projects.css'

const emptyForm = {
  title: '',
  description: '',
  due_date: '',
  is_favorite: false,
}

const emptyMemberForm = {
  user_id: '',
  role: 'member',
}

const palette = ['#7ec8c8', '#c98a7a', '#8ba4c4', '#98a88c', '#d4a574']
const healthStates = ['good', 'at_risk', 'on_track']
const taskStatuses = ['To Do', 'In Progress', 'In Review', 'Done']

function hashText(text = '') {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function formatDisplayDate(value) {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No due date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toIsoDateTime(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function getProjectVisual(project) {
  const seed = hashText(project.title || project.id || '')
  const color = palette[seed % palette.length]
  const progress = 30 + (seed % 60)
  const health = healthStates[seed % healthStates.length]
  return {
    color,
    progress,
    health,
    members: project.members?.slice(0, 3) || [],
  }
}

function getMemberInitial(member) {
  if (member?.avatar) return member.avatar
  if (member?.name) {
    return member.name
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }
  return 'U'
}

function getProjectStatusLabel(tasks = [], dueDate) {
  if (!tasks.length) return 'Planning'

  const completed = tasks.filter((task) => task.status === 'Done').length
  const overdue = tasks.filter((task) => task.due_date && task.status !== 'Done' && new Date(task.due_date).getTime() < Date.now()).length
  const progress = Math.round((completed / tasks.length) * 100)

  if (completed === tasks.length) return 'Completed'
  if (overdue > 0) return 'At risk'
  if (dueDate && new Date(dueDate).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 5) return 'Needs attention'
  if (progress >= 70) return 'On track'
  return 'Active'
}

function getStatusTone(label) {
  if (label === 'Completed' || label === 'On track') return 'good'
  if (label === 'At risk' || label === 'Needs attention') return 'warn'
  return 'neutral'
}

function sortByUpdatedAt(left, right) {
  return new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0)
}

export default function Projects() {
  const { profile, addToast } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeProjectId } = useParams()

  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [workspaceTasks, setWorkspaceTasks] = useState([])
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [projectForm, setProjectForm] = useState(emptyForm)
  const [memberForm, setMemberForm] = useState(emptyMemberForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const currentUserId = profile?.id

  const refreshProjects = async (preferredId = routeProjectId) => {
    setLoading(true)
    setError('')
    try {
      const data = await listProjects()
      setProjects(data)
      const activeId = preferredId || routeProjectId || data[0]?.id || null
      if (activeId) {
        const selected = data.find((project) => project.id === activeId)
        setSelectedProject(selected || null)
      } else {
        setSelectedProject(null)
      }
    } catch (requestError) {
      setError(requestError.message)
      addToast(requestError.message, 'warning')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshProjects(routeProjectId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeProjectId])

  useEffect(() => {
    if (location.state?.openCreate) {
      openCreateModal()
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  useEffect(() => {
    if (!routeProjectId && projects.length > 0 && !selectedProject) {
      navigate(`/projects/${projects[0].id}`, { replace: true })
    }
  }, [navigate, projects, routeProjectId, selectedProject])

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = projects.filter((project) => {
      const memberText = (project.members || []).map((member) => `${member.name || ''} ${member.role || ''}`).join(' ')
      const haystack = `${project.title} ${project.description || ''} ${memberText}`.toLowerCase()
      const matchesSearch = !query || haystack.includes(query)
      const matchesFilter =
        filter === 'all'
          || (filter === 'favorites' && project.is_favorite)
          || (filter === 'owned' && project.created_by === currentUserId)
          || (filter === 'recent' && project.last_opened)
      return matchesSearch && matchesFilter
    })

    if (filter === 'recent') {
      return [...filtered].sort((left, right) => new Date(right.last_opened || 0) - new Date(left.last_opened || 0))
    }

    return filtered
  }, [currentUserId, filter, projects, search])

  const activeProject = selectedProject || visibleProjects[0] || null
  const activeVisual = activeProject ? getProjectVisual(activeProject) : null
  const canManageMembers = activeProject && currentUserId && activeProject.created_by === currentUserId

  const activeProjectTasks = useMemo(
    () => [...workspaceTasks].sort(sortByUpdatedAt),
    [workspaceTasks],
  )

  const activeProjectMyTasks = useMemo(
    () => activeProjectTasks.filter((task) => task.assigned_to === currentUserId),
    [activeProjectTasks, currentUserId],
  )

  const activeProjectOverdue = useMemo(
    () => activeProjectTasks
      .filter((task) => task.due_date && task.status !== 'Done' && new Date(task.due_date).getTime() < Date.now())
      .slice(0, 4),
    [activeProjectTasks],
  )

  const activeProjectUpcoming = useMemo(
    () => activeProjectTasks
      .filter((task) => task.due_date && task.status !== 'Done' && new Date(task.due_date).getTime() >= Date.now())
      .sort((left, right) => new Date(left.due_date) - new Date(right.due_date))
      .slice(0, 4),
    [activeProjectTasks],
  )

  const activeProjectActivity = useMemo(() => activeProjectTasks.slice(0, 6), [activeProjectTasks])

  const activeProjectBuckets = useMemo(() => (
    taskStatuses.reduce((accumulator, status) => {
      accumulator[status] = activeProjectTasks.filter((task) => task.status === status).slice(0, 3)
      return accumulator
    }, {})
  ), [activeProjectTasks])

  const activeProjectStatus = activeProject ? getProjectStatusLabel(workspaceTasks, activeProject.due_date) : 'Planning'
  const activeProjectProgress = workspaceTasks.length
    ? Math.round((workspaceTasks.filter((task) => task.status === 'Done').length / workspaceTasks.length) * 100)
    : 0
  const activeProjectAssigned = workspaceTasks.filter((task) => task.assigned_to).length
  const activeProjectCompleted = workspaceTasks.filter((task) => task.status === 'Done').length
  const activeProjectOverdueCount = workspaceTasks.filter((task) => task.due_date && task.status !== 'Done' && new Date(task.due_date).getTime() < Date.now()).length

  const memberStats = useMemo(() => workspaceMembers.map((member) => {
    const assignedTasks = workspaceTasks.filter((task) => task.assigned_to === member.user_id)
    const completedTasks = assignedTasks.filter((task) => task.status === 'Done')
    const workload = workspaceTasks.length ? Math.min(100, Math.round((assignedTasks.length / workspaceTasks.length) * 100)) : 0
    return {
      ...member,
      assignedTasks,
      assignedCount: assignedTasks.length,
      completedCount: completedTasks.length,
      workload,
      active: assignedTasks.some((task) => task.status !== 'Done'),
    }
  }).sort((left, right) => right.assignedCount - left.assignedCount), [workspaceMembers, workspaceTasks])

  const activeCollaborators = memberStats.filter((member) => member.active).slice(0, 4)

  useEffect(() => {
    const loadWorkspace = async () => {
      if (!activeProject?.id) {
        setWorkspaceMembers([])
        setWorkspaceTasks([])
        return
      }

      setWorkspaceLoading(true)
      try {
        const [membersData, tasksData] = await Promise.all([
          getProjectMembers(activeProject.id),
          getProjectTasks(activeProject.id),
        ])
        setWorkspaceMembers(membersData || [])
        setWorkspaceTasks(tasksData || [])
      } catch (workspaceError) {
        setWorkspaceMembers([])
        setWorkspaceTasks([])
        addToast(workspaceError.message, 'warning')
      } finally {
        setWorkspaceLoading(false)
      }
    }

    loadWorkspace()
  }, [activeProject?.id, addToast])

  const openCreateModal = () => {
    setEditingProject(null)
    setProjectForm(emptyForm)
    setModalOpen(true)
  }

  const openEditModal = () => {
    if (!activeProject) return
    setEditingProject(activeProject)
    setProjectForm({
      title: activeProject.title || '',
      description: activeProject.description || '',
      due_date: formatDateTimeLocal(activeProject.due_date),
      is_favorite: Boolean(activeProject.is_favorite),
    })
    setModalOpen(true)
  }

  const handleProjectSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title: projectForm.title.trim(),
        description: projectForm.description.trim() || null,
        due_date: toIsoDateTime(projectForm.due_date),
        is_favorite: projectForm.is_favorite,
      }

      if (editingProject) {
        await updateProject(editingProject.id, payload)
        addToast('Project updated', 'success')
      } else {
        const created = await createProject(payload)
        addToast('Project created', 'success')
        navigate(`/projects/${created.id}`, { replace: true })
      }

      setModalOpen(false)
      setEditingProject(null)
      setProjectForm(emptyForm)
      await refreshProjects(editingProject?.id || routeProjectId)
    } catch (submitError) {
      addToast(submitError.message, 'warning')
    } finally {
      setSaving(false)
    }
  }

  const handleFavoriteToggle = async (project) => {
    try {
      await toggleProjectFavorite(project.id)
      addToast(project.is_favorite ? 'Removed from favorites' : 'Added to favorites', 'info')
      await refreshProjects(project.id)
    } catch (toggleError) {
      addToast(toggleError.message, 'warning')
    }
  }

  const handleDeleteProject = async () => {
    if (!activeProject) return
    const confirmed = window.confirm(`Delete ${activeProject.title}? This cannot be undone.`)
    if (!confirmed) return

    try {
      await deleteProject(activeProject.id)
      addToast('Project deleted', 'info')
      navigate('/projects', { replace: true })
      await refreshProjects()
    } catch (deleteError) {
      addToast(deleteError.message, 'warning')
    }
  }

  const handleAddMember = async (event) => {
    event.preventDefault()
    if (!activeProject || !canManageMembers) return
    if (!memberForm.user_id.trim()) return

    try {
      await addProjectMember(activeProject.id, {
        user_id: memberForm.user_id.trim(),
        role: memberForm.role.trim() || 'member',
      })
      addToast('Member added', 'success')
      setMemberForm(emptyMemberForm)
      await refreshProjects(activeProject.id)
    } catch (memberError) {
      addToast(memberError.message, 'warning')
    }
  }

  const handleRemoveMember = async (userId) => {
    if (!activeProject) return
    try {
      await removeProjectMember(activeProject.id, userId)
      addToast('Member removed', 'info')
      await refreshProjects(activeProject.id)
    } catch (memberError) {
      addToast(memberError.message, 'warning')
    }
  }

  return (
    <div className="projects-page">
      <header className="page-header projects-page__header">
        <div>
          <span className="page-header__eyebrow">Project workspace</span>
          <h1 className="page-header__title">Projects</h1>
          <p className="page-header__subtitle">Search, edit, star, and manage members from one lightweight workspace.</p>
        </div>
        <div className="projects-page__actions">
          <button type="button" className="projects-page__btn projects-page__btn--ghost" onClick={() => navigate('/')}>Dashboard</button>
          <button type="button" className="projects-page__btn projects-page__btn--primary" onClick={openCreateModal}>+ New Project</button>
        </div>
      </header>

      <section className="projects-toolbar">
        <label className="projects-toolbar__search">
          <span className="projects-toolbar__label">Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search project titles, descriptions, or members"
          />
        </label>

        <div className="projects-toolbar__filters">
          {[
            { value: 'all', label: 'All' },
            { value: 'favorites', label: 'Favorites' },
            { value: 'owned', label: 'Owned' },
            { value: 'recent', label: 'Recent' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={`projects-filter ${filter === item.value ? 'projects-filter--active' : ''}`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {error ? <div className="projects-page__notice projects-page__notice--error">{error}</div> : null}

      <div className="projects-layout">
        <section className="projects-list-panel">
          <div className="projects-list-panel__head">
            <h2>Project cards</h2>
            <span>{visibleProjects.length} visible</span>
          </div>

          {loading ? (
            <div className="projects-empty">Loading projects...</div>
          ) : visibleProjects.length === 0 ? (
            <div className="projects-empty">
              <p>No projects match the current search.</p>
              <button type="button" className="projects-page__btn projects-page__btn--primary" onClick={openCreateModal}>Create a project</button>
            </div>
          ) : (
            <div className="projects-list">
              {visibleProjects.map((project) => {
                const visual = getProjectVisual(project)
                const isActive = activeProject?.id === project.id
                return (
                  <div
                    key={project.id}
                    className={`project-card-lite ${isActive ? 'project-card-lite--active' : ''}`}
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
                    <div className="project-card-lite__top">
                      <div className="project-card-lite__title-row">
                        <span className="project-card-lite__swatch" style={{ backgroundColor: visual.color }} />
                        <div>
                          <h3 style={{ color: '#ffffff' }}>{project.title}</h3>
                          <p>{project.description || 'No description yet'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`project-card-lite__star ${project.is_favorite ? 'project-card-lite__star--active' : ''}`}
                        aria-label={project.is_favorite ? 'Remove favorite' : 'Add favorite'}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleFavoriteToggle(project)
                        }}
                      >
                        ★
                      </button>
                    </div>

                    <div className="project-card-lite__meta">
                      <span>{project.members?.length || 0} members</span>
                      <span>Due {formatDisplayDate(project.due_date)}</span>
                    </div>

                    <div className="project-card-lite__footer">
                      <div className="avatar-group">
                        {(project.members || []).slice(0, 3).map((member, index) => (
                          <div key={member.id} className="avatar-mini" style={{ zIndex: 3 - index }} title={member.name}>
                            {getMemberInitial(member)}
                          </div>
                        ))}
                      </div>
                      <div className="progress-bar" title={`${visual.progress}% complete`}>
                        <div className="progress-bar__fill" style={{ width: `${visual.progress}%`, backgroundColor: visual.color }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <aside className="projects-workspace-panel">
          {activeProject ? (
            <div className="projects-detail-panel">
              <header className="projects-detail-panel__hero">
                <div>
                  <h2>{activeProject.title}</h2>
                  <p>{activeProject.description || 'No description yet.'}</p>
                  <div className="project-detail__stats">
                    <div>
                      <small>Due</small>
                      <strong>{formatDisplayDate(activeProject.due_date)}</strong>
                    </div>
                    <div>
                      <small>Status</small>
                      <strong>{activeProjectStatus}</strong>
                    </div>
                    <div>
                      <small>Members</small>
                      <strong>{workspaceMembers.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="projects-detail-panel__actions">
                  <button type="button" className="projects-page__btn projects-page__btn--ghost" onClick={() => addToast('Team chat UI only (coming soon).', 'info')}>Start Team Chat</button>
                  <button type="button" className="projects-page__btn projects-page__btn--primary" onClick={() => window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer')}>Create Google Meet</button>
                  <button type="button" className="projects-page__btn projects-page__btn--ghost" onClick={() => navigate(`/projects/${activeProject.id}/workspace`)}>Open Workspace</button>
                </div>
              </header>

              <section className="project-detail-section">
                <div className="project-detail__tasks">
                  <h3>Your tasks</h3>
                  {activeProjectMyTasks.length > 0 ? activeProjectMyTasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="workspace-task-item">
                      <strong>{task.title}</strong>
                      <span>{task.status} · {formatDisplayDate(task.due_date)}</span>
                    </div>
                  )) : (
                    <p className="workspace-empty-copy">No tasks are currently assigned to you in this project.</p>
                  )}
                </div>

                <div className="member-list">
                  <h3>Members</h3>
                  {workspaceMembers.length > 0 ? workspaceMembers.map((member) => (
                    <div key={member.user_id} className="member-row">
                      <div className="member-row__avatar">{getMemberInitial(member)}</div>
                      <div className="member-row__body">
                        <div className="member-row__head">
                          <strong>{member.name || member.user_id}</strong>
                          <span>{member.role}</span>
                        </div>
                      </div>
                    </div>
                  )) : <p className="workspace-empty-copy">No members yet.</p>}
                </div>
              </section>

              <section className="project-detail__deadlines">
                <h3>Deadlines</h3>
                <div className="workspace-deadline-list">
                  <div>
                    <strong>Overdue</strong>
                    {activeProjectOverdue.length > 0 ? activeProjectOverdue.map((task) => (
                      <div key={task.id} className="workspace-deadline-item workspace-deadline-item--warning">
                        <span>{task.title}</span>
                        <span>{formatDisplayDate(task.due_date)}</span>
                      </div>
                    )) : <p className="workspace-empty-copy">No overdue tasks.</p>}
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="projects-empty projects-empty--detail">
              <p>Select a project card to view details or open its workspace.</p>
              <button type="button" className="projects-page__btn projects-page__btn--primary" onClick={openCreateModal}>Create project</button>
            </div>
          )}
        </aside>
      </div>

      {modalOpen ? (
        <div className="project-modal" role="presentation" onClick={() => setModalOpen(false)}>
          <div className="project-modal__card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="project-modal__head">
              <div>
                <span className="page-header__eyebrow">{editingProject ? 'Edit project' : 'Create project'}</span>
                <h3>{editingProject ? editingProject.title : 'New project'}</h3>
              </div>
              <button type="button" className="project-modal__close" onClick={() => setModalOpen(false)}>
                Close
              </button>
            </div>

            <form className="project-form" onSubmit={handleProjectSubmit}>
              <label>
                <span>Title</span>
                <input
                  type="text"
                  value={projectForm.title}
                  onChange={(event) => setProjectForm({ ...projectForm, title: event.target.value })}
                  required
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  rows="4"
                  value={projectForm.description}
                  onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })}
                />
              </label>
              <label>
                <span>Due date</span>
                <input
                  type="datetime-local"
                  value={projectForm.due_date}
                  onChange={(event) => setProjectForm({ ...projectForm, due_date: event.target.value })}
                />
              </label>
              <label className="project-form__toggle">
                <input
                  type="checkbox"
                  checked={projectForm.is_favorite}
                  onChange={(event) => setProjectForm({ ...projectForm, is_favorite: event.target.checked })}
                />
                <span>Mark as favorite</span>
              </label>

              <div className="project-form__actions">
                <button type="button" className="projects-page__btn projects-page__btn--ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="projects-page__btn projects-page__btn--primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
