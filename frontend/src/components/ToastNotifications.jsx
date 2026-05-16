import { useApp } from '../context/AppContext'
import './ToastNotifications.css'

export default function ToastNotifications() {
  const { toasts } = useApp()

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast, i) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          style={{ '--delay': `${i * 0.08}s` }}
        >
          <span className="toast__dot" />
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
