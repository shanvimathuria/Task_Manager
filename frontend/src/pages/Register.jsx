import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { register } = useApp()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Provide a simple avatar initials based on name
    const avatar = name.substring(0, 2).toUpperCase()
    const success = await register(name, email, password, avatar)
    if (success) {
      navigate('/')
    }
  }

  return (
    <div className="auth-container">
      <div className="nw-card auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join Task Manager today</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              className="nw-input"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="nw-input"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="nw-input"
            />
          </div>
          <button type="submit" className="nw-btn nw-btn--primary auth-submit">
            Sign Up
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login" className="nw-link">Login here</Link>
        </p>
      </div>
      <style>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .auth-card {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .auth-title {
          font-family: var(--font-display);
          font-size: 2rem;
          margin-bottom: 8px;
        }
        .auth-subtitle {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 24px;
        }
        .auth-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .nw-input {
          padding: 12px 16px;
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          font-size: 1rem;
        }
        .nw-input:focus {
          outline: none;
          border-color: var(--sage);
        }
        .auth-submit {
          margin-top: 16px;
          padding: 14px;
        }
        .auth-footer {
          margin-top: 24px;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}
