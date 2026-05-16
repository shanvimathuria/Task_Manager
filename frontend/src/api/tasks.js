const API_BASE = 'http://localhost:8000/api/tasks'

function getHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: getHeaders(options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.detail || data.message || 'Task request failed')
  }
  return data
}

export function getTasks() {
  return request('')
}

export function getMyTasks() {
  return request('/my-tasks')
}

export function getProjectTasks(projectId) {
  return request(`/project/${projectId}`)
}

export function getOverdueTasks() {
  return request('/overdue')
}

export function getTodayTasks() {
  return request('/today')
}

export function getUpcomingTasks() {
  return request('/upcoming')
}

export function getTask(taskId) {
  return request(`/${taskId}`)
}

export function createTask(payload) {
  return request('/create', {
    method: 'POST',
    body: payload,
  })
}

export function updateTask(taskId, payload) {
  return request(`/${taskId}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteTask(taskId) {
  return request(`/${taskId}`, {
    method: 'DELETE',
  })
}

export function updateTaskStatus(taskId, status) {
  return request(`/${taskId}/status`, {
    method: 'PUT',
    body: { status },
  })
}

export function assignTask(taskId, assigned_to) {
  return request(`/${taskId}/assign`, {
    method: 'PUT',
    body: { assigned_to },
  })
}

export function updateTaskPriority(taskId, priority) {
  return request(`/${taskId}/priority`, {
    method: 'PUT',
    body: { priority },
  })
}
