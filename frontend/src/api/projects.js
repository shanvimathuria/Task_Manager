const API_BASE = 'http://localhost:8000/api/projects'

function getAuthHeaders(extraHeaders = {}) {
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
    headers: getAuthHeaders(options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.detail || data.message || 'Project request failed')
  }
  return data
}

export function listProjects() {
  return request('')
}

export function getProject(projectId) {
  return request(`/${projectId}`)
}

export function createProject(payload) {
  return request('/create', {
    method: 'POST',
    body: payload,
  })
}

export function updateProject(projectId, payload) {
  return request(`/${projectId}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteProject(projectId) {
  return request(`/${projectId}`, {
    method: 'DELETE',
  })
}

export function getRecentProjects() {
  return request('/recent')
}

export function getFavoriteProjects() {
  return request('/favorites')
}

export function toggleProjectFavorite(projectId) {
  return request(`/${projectId}/favorite`, {
    method: 'PUT',
  })
}

export function addProjectMember(projectId, payload) {
  return request(`/${projectId}/add-member`, {
    method: 'POST',
    body: payload,
  })
}

export function removeProjectMember(projectId, userId) {
  return request(`/${projectId}/remove-member/${userId}`, {
    method: 'DELETE',
  })
}

export function getProjectMembers(projectId) {
  return request(`/${projectId}/members`)
}
