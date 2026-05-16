export default function NorthwindLogo({ className = '' }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Northwind Workspace logo"
    >
      <rect width="32" height="32" rx="8" fill="#141414"/>
      <rect width="32" height="32" rx="8" fill="url(#nw-logo-g)"/>
      <path
        d="M16 8l6 3v6l-6 3-6-3v-6l6-3z"
        stroke="#0c0c0c"
        strokeWidth="1.5"
        fill="rgba(0,0,0,0.15)"
      />
      <path
        d="M16 14v4M14 16h4"
        stroke="#0c0c0c"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="nw-logo-g" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#98A88C"/>
          <stop offset="1" stopColor="#6a7a62"/>
        </linearGradient>
      </defs>
    </svg>
  )
}
