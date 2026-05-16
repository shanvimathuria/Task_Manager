import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getProjectMembers } from '../api/projects'
import {
  assignTask,
  createTask,
  deleteTask,
  getOverdueTasks,
  getTodayTasks,
  getUpcomingTasks,
  updateTask,
  updateTaskPriority,
  updateTaskStatus,
} from '../api/tasks'
import './Tasks.css'

const STATUSES = ['To Do', 'In Progress', 'In Review', 'Done']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const EMPTY_FORM = {
  title: '',
  description: '',
  priority: 'Medium',
  status: 'To Do',
  due_date: '',
  assigned_to: '',
  project_id: '',
}

function toLocalDateTime(value) {
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

function formatDate(value) {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No due date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isTaskOverdue(task) {
  if (!task.due_date || task.status === 'Done') return false
  return new Date(task.due_date).getTime() < Date.now()
}

function taskPriorityLabel(priority) {
  return priority || 'Medium'
}

function taskPriorityClass(priority) {
  return String(priority || 'Medium').toLowerCase()
}

function getInitials(name = '') {
  const parts = name.split(' ').filter(Boolean)
  return parts.length ? parts.map((part) => part.charAt(0).toUpperCase()).slice(0, 2).join('') : 'U'
}

function bucketify(tasks) {
  return STATUSES.reduce((accumulator, status) => {
    accumulator[status] = tasks.filter((task) => task.status === status)
    return accumulator
  }, {})
}

export default function Tasks() {
  const { profile, addToast, tasks, tasksLoading, refreshTasks, projects, refreshProjects } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeTaskId } = useParams()

  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [taskForm, setTaskForm] = useState(EMPTY_FORM)
  const [projectMembers, setProjectMembers] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [summary, setSummary] = useState({ overdue: [], today: [], upcoming: [] })
  const [summaryLoading, setSummaryLoading] = useState(true)

  const activeTask = useMemo(() => {
    if (routeTaskId) {
      return tasks.find((task) => task.id === routeTaskId) || selectedTask || null
    }
    return selectedTask || null
  }, [routeTaskId, selectedTask, tasks])

  const currentUserId = profile?.id

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tasks.filter((task) => {
      const projectMatch = projectFilter === 'all' || task.project_id === projectFilter
      const haystack = `${task.title} ${task.description || ''} ${task.project_title || ''} ${task.assigned_name || ''}`.toLowerCase()
      const searchMatch = !query || haystack.includes(query)
      return projectMatch && searchMatch
    })
  }, [projectFilter, search, tasks])

  const taskBuckets = useMemo(() => bucketify(filteredTasks), [filteredTasks])

  const loadSummary = async () => {
    setSummaryLoading(true)
    try {
      const [overdue, today, upcoming] = await Promise.all([getOverdueTasks(), getTodayTasks(), getUpcomingTasks()])
      setSummary({ overdue, today, upcoming })
    } catch (error) {
      addToast(error.message, 'warning')
    } finally {
      setSummaryLoading(false)
    }
  }

  const loadProjectMembers = async (projectId) => {
    if (!projectId) {
      setProjectMembers([])
      return
    }

    try {
      const members = await getProjectMembers(projectId)
      setProjectMembers(members)
    } catch (error) {
      setProjectMembers([])
    }
  }

  useEffect(() => {
    refreshProjects()
    refreshTasks()
    loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (location.state?.createTask) {
      openCreateModal(location.state.status || 'To Do')
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  useEffect(() => {
    if (activeTask) {
      setSelectedTask(activeTask)
      loadProjectMembers(activeTask.project_id)
      return
    }
    setProjectMembers([])
  }, [activeTask])

  useEffect(() => {
    if (!taskForm.project_id && projects.length > 0) {
      setTaskForm((previous) => ({ ...previous, project_id: projects[0].id }))
    }
  }, [projects, taskForm.project_id])

  useEffect(() => {
    if (taskForm.project_id) {
      loadProjectMembers(taskForm.project_id)
    }
  }, [taskForm.project_id])

  const openCreateModal = (status = 'To Do') => {
    setEditingTask(null)
    setTaskForm({ ...EMPTY_FORM, status, project_id: projects[0]?.id || '' })
    setModalOpen(true)
    if (projects[0]?.id) {
      loadProjectMembers(projects[0].id)
    }
  }

  const openEditModal = (task) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'Medium',
      status: task.status || 'To Do',
      due_date: toLocalDateTime(task.due_date),
      assigned_to: task.assigned_to || '',
      project_id: task.project_id || '',
    })
    setModalOpen(true)
    loadProjectMembers(task.project_id)
  }

  const handleTaskSubmit = async (event) => {
    event.preventDefault()
    try {
      const payload = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        priority: taskForm.priority,
        status: taskForm.status,
        due_date: toIsoDateTime(taskForm.due_date),
        assigned_to: taskForm.assigned_to || null,
        project_id: taskForm.project_id,
      }

      if (editingTask) {
        await updateTask(editingTask.id, payload)
        addToast('Task updated', 'success')
      } else {
        await createTask(payload)
        addToast('Task created', 'success')
      }

      setModalOpen(false)
      setEditingTask(null)
      setTaskForm(EMPTY_FORM)
      await refreshTasks()
      await loadSummary()
    } catch (error) {
      addToast(error.message, 'warning')
    }
  }

  const handleDeleteTask = async (task) => {
    const confirmed = window.confirm(`Delete ${task.title}?`)
    if (!confirmed) return

    try {
      await deleteTask(task.id)
      addToast('Task deleted', 'info')
      setSelectedTask(null)
      await refreshTasks()
      await loadSummary()
    } catch (error) {
      addToast(error.message, 'warning')
    }
  }

  const handleUpdateStatus = async (task, status) => {
    try {
      await updateTaskStatus(task.id, status)
      await refreshTasks()
      await loadSummary()
      if (selectedTask?.id === task.id) {
        setSelectedTask((previous) => (previous ? { ...previous, status } : previous))
      }
    } catch (error) {
      addToast(error.message, 'warning')
    }
  }

  const handlePriorityChange = async (task, priority) => {
    try {
      await updateTaskPriority(task.id, priority)
      await refreshTasks()
      if (selectedTask?.id === task.id) {
        setSelectedTask((previous) => (previous ? { ...previous, priority } : previous))
      }
    } catch (error) {
      addToast(error.message, 'warning')
    }
  }

  const handleAssignChange = async (task, assignedTo) => {
    try {
      await assignTask(task.id, assignedTo || null)
      await refreshTasks()
      if (selectedTask?.id === task.id) {
        setSelectedTask((previous) => (previous ? { ...previous, assigned_to: assignedTo || null } : previous))
      }
    } catch (error) {
      addToast(error.message, 'warning')
    }
  }

  const handleDrop = async (event, status) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('task-id')
    if (!taskId) return
    const draggedTask = tasks.find((task) => task.id === taskId)
    if (!draggedTask || draggedTask.status === status) return
    await handleUpdateStatus(draggedTask, status)
  }

  const taskDetail = activeTask ? tasks.find((task) => task.id === activeTask.id) || activeTask : null

  return (
    <div className="tasks-page">
      <header className="page-header tasks-page__header">
        <div>
          <span className="page-header__eyebrow">Task workspace</span>
          <h1 className="page-header__title">Tasks</h1>
          <p className="page-header__subtitle">Manage project work, drag cards between columns, and assign owners without leaving the page.</p>
        </div>
        <div className="tasks-page__actions">
          <button type="button" className="tasks-page__btn tasks-page__btn--ghost" onClick={() => navigate('/')}>
            Dashboard
          </button>
          <button type="button" className="tasks-page__btn tasks-page__btn--primary" onClick={() => openCreateModal('To Do')}>
            + New Task
          </button>
        </div>
      </header>

      <section className="task-summary-grid">
        {[
          { label: 'Overdue', value: summary.overdue.length, tone: 'danger' },
          { label: 'Today', value: summary.today.length, tone: 'sage' },
          { label: 'Upcoming', value: summary.upcoming.length, tone: 'amber' },
          { label: 'Assigned to me', value: tasks.filter((task) => task.assigned_to === currentUserId).length, tone: 'slate' },
        ].map((item) => (
          <article key={item.label} className={`task-summary-card task-summary-card--${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {/* removed 'Synced from backend' line per UX request */}
          </article>
        ))}
      </section>

      <section className="tasks-toolbar">
        <label className="tasks-toolbar__search">
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, project, or assignee"
          />
        </label>

        <div className="tasks-toolbar__filters">
          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.title}</option>
            ))}
          </select>
        </div>
      </section>

      <div className="tasks-layout">
        <main className="kanban-board">
          {tasksLoading ? (
            <div className="tasks-empty">Loading tasks...</div>
          ) : STATUSES.map((status) => (
            <section
              key={status}
              className="kanban-column"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, status)}
            >
              <div className="kanban-column__head">
                <h2>{status}</h2>
                <span>{taskBuckets[status]?.length || 0}</span>
              </div>
              <div className="kanban-column__body">
                {taskBuckets[status]?.map((task) => {
                  const overdue = isTaskOverdue(task)
                  return (
                    <button
                      key={task.id}
                      type="button"
                      className={`task-card ${overdue ? 'task-card--overdue' : ''}`}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData('task-id', task.id)}
                      onClick={() => {
                        setSelectedTask(task)
                        navigate(`/tasks/${task.id}`)
                      }}
                    >
                      <div className="task-card__head">
                        <span className={`task-priority task-priority--${taskPriorityClass(task.priority)}`}>{task.priority}</span>
                        <span className="task-card__id">{task.project_title || task.project_id}</span>
                      </div>
                      <h3>{task.title}</h3>
                      <p>{task.description || 'No description provided.'}</p>
                      <div className="task-card__footer">
                        <span>{task.assigned_name || 'Unassigned'}</span>
                        <span>{formatDate(task.due_date)}</span>
                      </div>
                    </button>
                  )
                })}
                <button type="button" className="kanban-add-task" onClick={() => openCreateModal(status)}>
                  + Add task
                </button>
              </div>
            </section>
          ))}
        </main>

        <aside className="tasks-sidebar">
          <section className="tasks-mini-panel">
            <div className="tasks-mini-panel__head">
              <h2>Overdue tasks</h2>
              <span>{summary.overdue.length}</span>
            </div>
            <ul>
              {(summary.overdue || []).slice(0, 4).map((task) => (
                <li key={task.id}>{task.title}</li>
              ))}
            </ul>
          </section>

          <section className="tasks-mini-panel">
            <div className="tasks-mini-panel__head">
              <h2>Today</h2>
              <span>{summary.today.length}</span>
            </div>
            <ul>
              {(summary.today || []).slice(0, 4).map((task) => (
                <li key={task.id}>{task.title}</li>
              ))}
            </ul>
          </section>

          <section className="tasks-mini-panel">
            <div className="tasks-mini-panel__head">
              <h2>Upcoming deadlines</h2>
              <span>{summary.upcoming.length}</span>
            </div>
            <ul>
              {(summary.upcoming || []).slice(0, 4).map((task) => (
                <li key={task.id}>{task.title}</li>
              ))}
            </ul>
          </section>

          {taskDetail ? (
            <section className="task-drawer">
              <div className="task-drawer__head">
                <div>
                  <span className="page-header__eyebrow">Task details</span>
                  <h2>{taskDetail.title}</h2>
                </div>
                <button type="button" className="task-drawer__close" onClick={() => {
                  setSelectedTask(null)
                  navigate('/tasks', { replace: true })
                }}>
                  Close
                </button>
              </div>

              <p className="task-drawer__description">{taskDetail.description || 'No description provided.'}</p>

              <div className="task-drawer__meta">
                <div>
                  <span>Project</span>
                  <strong>{taskDetail.project_title || taskDetail.project_id}</strong>
                </div>
                <div>
                  <span>Due date</span>
                  <strong>{formatDate(taskDetail.due_date)}</strong>
                </div>
                <div>
                  <span>Creator</span>
                  <strong>{taskDetail.creator_name || 'Unknown'}</strong>
                </div>
              </div>

              <div className="task-drawer__controls">
                <label>
                  <span>Status</span>
                  <select value={taskDetail.status} onChange={(event) => handleUpdateStatus(taskDetail, event.target.value)}>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Priority</span>
                  <select value={taskPriorityLabel(taskDetail.priority)} onChange={(event) => handlePriorityChange(taskDetail, event.target.value)}>
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Assigned member</span>
                  <select value={taskDetail.assigned_to || ''} onChange={(event) => handleAssignChange(taskDetail, event.target.value)}>
                    <option value="">Unassigned</option>
                    {(projectMembers || []).map((member) => (
                      <option key={member.user_id} value={member.user_id}>{member.name || member.user_id}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="task-drawer__members">
                {(projectMembers || []).map((member) => (
                  <div key={member.id || member.user_id} className="task-member-row">
                    <div className="task-member-row__avatar">{getInitials(member.name || member.user_id || '')}</div>
                    <div>
                      <strong>{member.name || 'Unknown'}</strong>
                      <span>{member.role}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="task-drawer__actions">
                <button type="button" className="tasks-page__btn tasks-page__btn--ghost" onClick={() => openEditModal(taskDetail)}>
                  Edit
                </button>
                <button type="button" className="tasks-page__btn tasks-page__btn--danger" onClick={() => handleDeleteTask(taskDetail)}>
                  Delete
                </button>
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {modalOpen ? (
        <div className="task-modal" role="presentation" onClick={() => setModalOpen(false)}>
          <div className="task-modal__card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="task-modal__head">
              <div>
                <span className="page-header__eyebrow">{editingTask ? 'Edit task' : 'Create task'}</span>
                <h2>{editingTask ? editingTask.title : 'New task'}</h2>
              </div>
              <button type="button" className="task-modal__close" onClick={() => setModalOpen(false)}>
                Close
              </button>
            </div>

            <form className="task-form" onSubmit={handleTaskSubmit}>
              <label>
                <span>Title</span>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                  required
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  rows="4"
                  value={taskForm.description}
                  onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
                />
              </label>
              <div className="task-form__grid">
                <label>
                  <span>Status</span>
                  <select value={taskForm.status} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value })}>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Priority</span>
                  <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Due date</span>
                  <input
                    type="datetime-local"
                    value={taskForm.due_date}
                    onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })}
                  />
                </label>
                <label>
                  <span>Project</span>
                  <select
                    value={taskForm.project_id}
                    onChange={(event) => {
                      setTaskForm({ ...taskForm, project_id: event.target.value, assigned_to: '' })
                    }}
                    required
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.title}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>Assign member</span>
                <select value={taskForm.assigned_to} onChange={(event) => setTaskForm({ ...taskForm, assigned_to: event.target.value })}>
                  <option value="">Unassigned</option>
                  {(projectMembers || []).map((member) => (
                    <option key={member.user_id} value={member.user_id}>{member.name || member.user_id}</option>
                  ))}
                </select>
              </label>

              <div className="task-form__actions">
                <button type="button" className="tasks-page__btn tasks-page__btn--ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="tasks-page__btn tasks-page__btn--primary">
                  Save task
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
