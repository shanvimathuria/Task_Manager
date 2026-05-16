import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import './Chat.css'
import { API_URL } from '../config'
export default function Chat() {
  const { user, authToken } = useApp()
  const [activeTab, setActiveTab] = useState('personal') // 'personal' or 'team'
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [availableProjects, setAvailableProjects] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [error, setError] = useState('')
  const [newChatSearch, setNewChatSearch] = useState('')
  const messagesEndRef = useRef(null)

  

  const API_BASE = `${API_URL}/api/chat`

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Debug: Log auth state
  useEffect(() => {
    console.log('Chat Component - Auth State:', {
      hasUser: !!user,
      hasAuthToken: !!authToken,
      userId: user?.id,
      userName: user?.name,
    })
  }, [user, authToken])

  // Fetch conversations based on active tab
  useEffect(() => {
    if (!user || !authToken) return
    fetchConversations()
    const interval = setInterval(fetchConversations, 3000)
    return () => clearInterval(interval)
  }, [activeTab, user, authToken])

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages()
      const interval = setInterval(fetchMessages, 2000)
      return () => clearInterval(interval)
    }
  }, [activeConversation])

  const fetchConversations = async () => {
    if (!authToken) {
      console.warn('No auth token available for fetching conversations')
      return
    }
    try {
      const endpoint = activeTab === 'personal' ? '/direct' : '/conversations'
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data)
        setError('')
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error(`Failed to fetch ${activeTab} conversations:`, response.status, errorData)
        setError(`Failed to fetch conversations: ${response.status}`)
      }
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
      setError(`Error: ${error.message}`)
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    if (!activeConversation || !authToken) return

    try {
      const endpoint = activeTab === 'personal' 
        ? `/direct/${activeConversation.id}`
        : `/messages/${activeConversation.id}`
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch messages:', response.status, errorData)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const fetchAvailableProjects = async () => {
    if (!authToken) {
      console.warn('No auth token available')
      setError('Not authenticated')
      return
    }
    try {
      const response = await fetch(`${API_BASE}/projects`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAvailableProjects(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch projects:', response.status, errorData)
        setError(`Failed to fetch projects: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      setError(`Error: ${error.message}`)
    }
  }

  const fetchAvailableUsers = async () => {
    if (!authToken) {
      console.warn('No auth token available')
      setError('Not authenticated')
      return
    }
    try {
      const response = await fetch(`${API_BASE}/dm-users`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAvailableUsers(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch users:', response.status, errorData)
        setError(`Failed to fetch users: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setError(`Error: ${error.message}`)
    }
  }

  const handleNewTeamChat = async (projectId) => {
    if (!authToken) {
      setError('Not authenticated')
      return
    }
    
    try {
      console.log('Creating team chat for project:', projectId)
      const response = await fetch(`${API_BASE}/create-conversation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ project_id: projectId })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Team chat created:', data)
        setConversations([...conversations, data])
        setActiveConversation(data)
        setShowNewChat(false)
        setError('')
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to create team chat:', response.status, errorData)
        setError(errorData.detail || `Failed to create chat: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to create team chat:', error)
      setError(`Error: ${error.message}`)
    }
  }

  const handleNewDirectChat = async (userId) => {
    if (!authToken) {
      setError('Not authenticated')
      return
    }
    
    try {
      console.log('Creating direct chat with user:', userId)
      const response = await fetch(`${API_BASE}/create-direct-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id_2: userId })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Direct chat created:', data)
        
        // Set the new conversation as active immediately
        setActiveConversation(data)
        setShowNewChat(false)
        setNewChatSearch('')
        setError('')
        
        // Fetch updated conversations list to refresh
        await fetchConversations()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to create direct chat:', response.status, errorData)
        setError(errorData.detail || `Failed to create chat: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to create direct chat:', error)
      setError(`Error: ${error.message}`)
    }
  }

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return

    try {
      const endpoint = activeTab === 'personal'
        ? '/send-direct-message'
        : '/send-message'

      const payload = {
        conversation_id: activeConversation.id,
        message: messageInput
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setMessageInput('')
        await fetchMessages()
      } else {
        const err = await response.json()
        setError(err.detail || 'Failed to send message')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setError(`Error: ${error.message}`)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getConversationTitle = (conv) => {
    if (activeTab === 'personal') {
      return conv.other_user?.name || conv.other_user?.email || 'Unknown User'
    } else {
      return conv.project?.title || `Project ${conv.project_id?.slice(0, 8)}`
    }
  }

  const getConversationAvatar = (conv) => {
    if (activeTab === 'personal') {
      return conv.other_user?.avatar || '👤'
    } else {
      return '💼'
    }
  }

  const filteredConversations = conversations.filter(conv => {
    const title = getConversationTitle(conv).toLowerCase()
    return title.includes(searchQuery.toLowerCase())
  })

  const handleNewChatClick = async () => {
    setShowNewChat(!showNewChat)
    setNewChatSearch('')
    if (!showNewChat) {
      console.log('Opening new chat menu for tab:', activeTab)
      console.log('Auth token available:', !!authToken)
      if (activeTab === 'team') {
        console.log('Fetching available projects...')
        await fetchAvailableProjects()
      } else {
        console.log('Fetching available users...')
        await fetchAvailableUsers()
      }
    }
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-sidebar__header">
            <h2>Messages</h2>
            <button className="chat-new-btn" onClick={handleNewChatClick} title="Start new chat">
              <span>+</span>
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="chat-tabs">
            <button 
              className={`chat-tab ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('personal')
                setActiveConversation(null)
                setMessages([])
                setShowNewChat(false)
                setNewChatSearch('')
              }}
            >
              Personal
            </button>
            <button 
              className={`chat-tab ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('team')
                setActiveConversation(null)
                setMessages([])
                setShowNewChat(false)
                setNewChatSearch('')
              }}
            >
              Team
            </button>
          </div>

          {/* New Chat Menu */}
          {showNewChat && (
            <div className="chat-new-menu">
              {activeTab === 'team' ? (
                <>
                  <div className="chat-new-menu__title">Start Team Chat</div>
                  {availableProjects.length === 0 ? (
                    <div className="chat-new-menu__empty">No projects available</div>
                  ) : (
                    availableProjects.map(project => (
                      <button
                        key={project.id}
                        className="chat-new-menu__item"
                        onClick={() => handleNewTeamChat(project.id)}
                      >
                        <span className="chat-new-menu__icon">💼</span>
                        {project.title}
                      </button>
                    ))
                  )}
                </>
              ) : (
                <>
                  <div className="chat-new-menu__title">Start Direct Message</div>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={newChatSearch}
                    onChange={(e) => setNewChatSearch(e.target.value)}
                    className="chat-new-menu__search"
                  />
                  {availableUsers.filter(u => 
                    u.name?.toLowerCase().includes(newChatSearch.toLowerCase()) || 
                    u.email?.toLowerCase().includes(newChatSearch.toLowerCase())
                  ).length === 0 ? (
                    <div className="chat-new-menu__empty">
                      {availableUsers.length === 0 ? 'No users available' : 'No users match your search'}
                    </div>
                  ) : (
                    availableUsers.filter(u => 
                      u.name?.toLowerCase().includes(newChatSearch.toLowerCase()) || 
                      u.email?.toLowerCase().includes(newChatSearch.toLowerCase())
                    ).map(user => (
                      <button
                        key={user.id}
                        className="chat-new-menu__item"
                        onClick={() => handleNewDirectChat(user.id)}
                      >
                        <span className="chat-new-menu__icon">👤</span>
                        <div>
                          <div>{user.name || 'Unknown'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {user.email}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </>
              )}
            </div>
          )}

          {/* Search */}
          <div className="chat-search">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="chat-search__input"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="chat-error">
              {error}
            </div>
          )}

          {/* Conversations List */}
          <div className="chat-conversations">
            {loading ? (
              <div className="chat-empty">Loading...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="chat-empty">
                <span className="chat-empty__icon">💬</span>
                <p>No {activeTab === 'personal' ? 'personal' : 'team'} chats yet</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click + to start one</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  className={`chat-conversation ${activeConversation?.id === conv.id ? 'active' : ''}`}
                  onClick={() => setActiveConversation(conv)}
                >
                  <div className="chat-conversation__avatar">
                    {getConversationAvatar(conv)}
                  </div>
                  <div className="chat-conversation__info">
                    <div className="chat-conversation__title">
                      {getConversationTitle(conv)}
                    </div>
                    <div className="chat-conversation__preview">
                      {messages.length > 0 ? messages[messages.length - 1].message.substring(0, 30) : 'No messages'}
                    </div>
                  </div>
                  <div className="chat-conversation__meta">
                    <span className="chat-conversation__time">
                      {formatTime(conv.updated_at || conv.created_at)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="chat-panel">
          {!activeConversation ? (
            <div className="chat-empty-state">
              <span className="chat-empty-state__icon">💬</span>
              <h3>Select a conversation</h3>
              <p>Choose a chat from the sidebar or click + to start a new one</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-header__info">
                  <h2>{getConversationTitle(activeConversation)}</h2>
                  <span className="chat-header__status">Active</span>
                </div>
                <button className="chat-header__action">⋮</button>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-messages__empty">
                    <span>👋</span>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isCurrentUser = msg.sender_id === user?.id
                    const showTimestamp = idx === 0 || 
                      new Date(messages[idx - 1].created_at).getTime() - new Date(msg.created_at).getTime() > 60000

                    return (
                      <div key={msg.id}>
                        {showTimestamp && (
                          <div className="chat-timestamp">
                            {formatTime(msg.created_at)}
                          </div>
                        )}
                        <div className={`chat-message ${isCurrentUser ? 'sent' : 'received'}`}>
                          {!isCurrentUser && (
                            <div className="chat-message__avatar">
                              {msg.sender_name?.charAt(0).toUpperCase() || '👤'}
                            </div>
                          )}
                          <div className="chat-message__content">
                            {!isCurrentUser && (
                              <div className="chat-message__sender">{msg.sender_name}</div>
                            )}
                            <div className="chat-message__text">{msg.message}</div>
                            {msg.is_edited && (
                              <div className="chat-message__edited">(edited)</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="chat-input-wrapper">
                <div className="chat-input">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    className="chat-input__field"
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={!messageInput.trim()}
                    className="chat-input__send"
                  >
                    ➤
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
