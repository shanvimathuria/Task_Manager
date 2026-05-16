export const user = {
  name: 'Jordan',
  username: 'jordan.n',
  email: 'jordan@northwind.io',
  avatar: 'JN',
  role: 'Product Lead',
}

export const recentProjects = [
  { id: 1, name: 'Atlas', color: '#98A88C' },
  { id: 2, name: 'Helios', color: '#D4A574' },
]

export const stats = [
  { id: 'active', label: 'Active Tasks', value: 48, trend: '+8 this week', color: '#7ec8c8', sparkline: [12, 18, 14, 22, 20, 28, 24] },
  { id: 'completed', label: 'Completed', value: 127, trend: '+18 this week', color: '#8fbc8f', sparkline: [5, 10, 15, 20, 25, 30, 28] },
  { id: 'overdue', label: 'Overdue', value: 5, trend: '2 urgent', color: '#c98a7a', sparkline: [1, 2, 1, 3, 4, 5, 5] },
  { id: 'review', label: 'In Review', value: 13, trend: '+4 pending', color: '#d4a574', sparkline: [8, 10, 9, 12, 11, 14, 13] },
]

export const activeProjects = [
  { id: 1, name: 'Atlas', tasks: 12, members: ['AC', 'SR', 'ML'], due: 'May 22', color: '#98A88C', progress: 72, health: 'good' },
  { id: 2, name: 'Helios', tasks: 8, members: ['JN', 'AC'], due: 'Jun 4', color: '#D4A574', progress: 45, health: 'at_risk' },
  { id: 3, name: 'Orbit', tasks: 24, members: ['SR', 'ML', 'JN'], due: 'Jul 15', color: '#8ba4c4', progress: 15, health: 'on_track' }
]

export const myTasks = {
  todo: [
    { id: 'NW-519', title: 'Update documentation for API v2', project: 'Orbit', icon: '○' },
    { id: 'NW-520', title: 'Design system tokens sync', project: 'Atlas', icon: '○' },
  ],
  in_progress: [
    { id: 'NW-518', title: 'Sprint review deck narrative structure', project: 'Atlas', icon: '◇', featured: true },
    { id: 'NW-501', title: 'Audit backdrop-filter fallbacks', project: 'Helios', icon: '◇' },
  ],
  review: [
    { id: 'NW-492', title: 'Auth middleware refactoring', project: 'Helios', icon: '△' },
  ],
  done: [
    { id: 'NW-482', title: 'Refine shadow-mapping logic', project: 'Atlas', icon: '✦' },
    { id: 'NW-480', title: 'Fix mobile navigation bug', project: 'Orbit', icon: '✦' },
  ]
}

export const teamOnline = [
  { id: 1, name: 'Alex Chen', role: 'Designer', avatar: 'AC', status: 'online', load: 72, currentTask: 'Hero wireframes' },
  { id: 2, name: 'Sam Rivera', role: 'Engineer', avatar: 'SR', status: 'online', load: 85, currentTask: 'Auth API' },
  { id: 3, name: 'Morgan Lee', role: 'Product Lead', avatar: 'ML', status: 'away', load: 30, currentTask: 'Sprint planning' },
  { id: 4, name: 'Taylor Swift', role: 'Engineer', avatar: 'TS', status: 'online', load: 45, currentTask: 'Testing UI' },
]

export const deadlines = [
  { id: 1, title: 'Sprint review deck', when: 'Tomorrow · 10:00 AM', project: 'Atlas', tag: 'CRITICAL', urgent: true },
  { id: 2, title: 'v2.1 release candidate', when: 'May 20 · 2:00 PM', project: 'Helios', tag: 'HELIOS', urgent: false },
  { id: 3, title: 'Beta onboarding flow', when: 'May 24 · 11:30 AM', project: 'Orbit', tag: 'ORBIT', urgent: false },
  { id: 4, title: 'Security audit', when: 'May 28 · 5:00 PM', project: 'Internal', tag: 'CORE', urgent: false },
]

export const activity = [
  { id: 1, user: 'Alex', avatar: 'AC', action: 'completed', target: 'Hero wireframes', time: '2m ago', project: 'Atlas' },
  { id: 2, user: 'Sam', avatar: 'SR', action: 'commented on', target: 'Auth middleware', time: '14m ago', project: 'Helios' },
  { id: 3, user: 'Morgan', avatar: 'ML', action: 'assigned you', target: 'Sprint deck', time: '1h ago', project: 'Atlas' },
  { id: 4, user: 'Taylor', avatar: 'TS', action: 'pushed to', target: 'main branch', time: '2h ago', project: 'Orbit' },
]

export const notifications = [
  { id: 1, text: 'Design system sync in 15m', type: 'warning' },
  { id: 2, text: 'Atlas build deployed successfully', type: 'success' }
]

export const productivity = {
  insight: 'Team velocity is optimal. 4 members active.',
}

export const analyticsData = {
  weeklyCompletion: [12, 18, 15, 22, 19, 28, 24],
  projectDistribution: [
    { name: 'Atlas', value: 35, color: '#98A88C' },
    { name: 'Helios', value: 25, color: '#D4A574' },
  ],
  productivity: 87,
  avgCompletion: '2.4 days',
  tasksThisWeek: 42,
}
