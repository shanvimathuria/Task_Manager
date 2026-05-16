import { useState, useEffect, useRef } from 'react'
import './PixelCat.css'

const QUOTES = [
  
  "I was promised unlimited tuna for guarding this footer.",
  "Fun fact: this app runs on caffeine and questionable decisions.",
  "Click carefully… some buttons may summon new features.",
  "The chat system heard everything. 👀",
  "Achievement unlocked: Footer Explorer.",
  "Low battery. Need emotional support and snacks.",
  "There may or may not be a secret mini-game hidden here…",
]

// Pure SVG pixel-art cat — drawn on a 16×16 grid scaled up
function CatSVG() {
  return (
    <svg
      className="pcat-svg"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ears */}
      <rect x="2" y="1" width="2" height="3" fill="#5a6e52"/>
      <rect x="3" y="2" width="1" height="2" fill="#a8c5ac"/>
      <rect x="12" y="1" width="2" height="3" fill="#5a6e52"/>
      <rect x="12" y="2" width="1" height="2" fill="#a8c5ac"/>

      {/* head */}
      <rect x="3" y="3" width="10" height="7" rx="1" fill="#7a9e7e"/>
      {/* forehead stripe */}
      <rect x="7" y="3" width="2" height="2" fill="#5a6e52"/>

      {/* eyes — animated via CSS classes */}
      <rect className="pcat-eye pcat-eye--l" x="5" y="6" width="2" height="2" fill="#2a2520"/>
      <rect className="pcat-eye pcat-eye--r" x="9" y="6" width="2" height="2" fill="#2a2520"/>
      {/* eye shine */}
      <rect x="5" y="6" width="1" height="1" fill="#fff" opacity="0.7"/>
      <rect x="9" y="6" width="1" height="1" fill="#fff" opacity="0.7"/>

      {/* nose */}
      <rect x="7" y="8" width="2" height="1" fill="#c98a7a"/>
      {/* mouth */}
      <rect x="6" y="9" width="1" height="1" fill="#5a6e52"/>
      <rect x="9" y="9" width="1" height="1" fill="#5a6e52"/>

      {/* whiskers left */}
      <rect x="1" y="8" width="4" height="1" fill="#2a2520" opacity="0.4"/>
      <rect x="1" y="9" width="3" height="1" fill="#2a2520" opacity="0.3"/>
      {/* whiskers right */}
      <rect x="11" y="8" width="4" height="1" fill="#2a2520" opacity="0.4"/>
      <rect x="12" y="9" width="3" height="1" fill="#2a2520" opacity="0.3"/>

      {/* body */}
      <rect x="4" y="10" width="8" height="5" rx="1" fill="#7a9e7e"/>
      {/* belly */}
      <rect x="6" y="11" width="4" height="3" fill="#a8c5ac"/>

      {/* front paws */}
      <rect x="4" y="14" width="2" height="2" rx="1" fill="#5a6e52"/>
      <rect x="10" y="14" width="2" height="2" rx="1" fill="#5a6e52"/>

      {/* tail — animated via CSS */}
      <rect className="pcat-tail" x="13" y="11" width="2" height="5" rx="1" fill="#5a6e52"/>
      <rect className="pcat-tail" x="14" y="10" width="2" height="3" rx="1" fill="#5a6e52"/>
    </svg>
  )
}

export default function PixelCat() {
  const [hovered, setHovered] = useState(false)
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [visible, setVisible] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const intervalRef = useRef(null)
  const showTimerRef = useRef(null)

  // Rotate quotes while hovered
  useEffect(() => {
    if (hovered) {
      // Small delay before showing bubble
      showTimerRef.current = setTimeout(() => setVisible(true), 80)
      intervalRef.current = setInterval(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length)
      }, 3500)
    } else {
      clearTimeout(showTimerRef.current)
      clearInterval(intervalRef.current)
      setVisible(false)
    }
    return () => {
      clearTimeout(showTimerRef.current)
      clearInterval(intervalRef.current)
    }
  }, [hovered])

  const handleClick = () => {
    const next = clickCount + 1
    setClickCount(next)
    // Secret: 5 clicks opens a fun alert
    if (next === 5) {
      setClickCount(0)
      alert('🐱 SECRET UNLOCKED\n\nYou clicked the cat 5 times.\nThe developer is proud of you.\n\nReward: +1 imaginary tuna can.')
    }
  }

  return (
    <div
      className="pcat-wrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Secret pixel cat easter egg"
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      {/* Speech bubble */}
      <div className={`pcat-bubble ${visible ? 'pcat-bubble--show' : ''}`} aria-live="polite">
        <div className="pcat-bubble-inner">
          <span className="pcat-bubble-text">{QUOTES[quoteIdx]}</span>
        </div>
        <div className="pcat-bubble-tail" />
      </div>

      {/* The cat */}
      <div className="pcat-body">
        <CatSVG />
      </div>
    </div>
  )
}
