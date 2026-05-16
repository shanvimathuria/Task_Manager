import { useId } from 'react'

export default function NorthwindLogo({ className = '' }) {
  const gradientId = useId()

  return (
    <svg className={className} viewBox="0 0 40 40" role="img" aria-label="Northwind logo" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="10" fill={`url(#${gradientId})`} />
      <path d="M12 24V13.5L20 24V13.5" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M25 13.5L28 20L25 26.5" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="15" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
      <defs>
        <linearGradient id={gradientId} x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9f7aea" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
    </svg>
  )
}