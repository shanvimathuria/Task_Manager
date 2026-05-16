import './MarqueeFooter.css'

const ITEMS = [
  { text: 'Status: Powered by iced coffee', emoji: '☕' },
  { text: 'Listening to synthwave at 2AM', emoji: '🎧' },
  { text: 'Building cool stuff one commit at a time', emoji: '💻' },
  { text: 'All systems operational', emoji: '✅' },
  { text: 'Shipping features, not excuses', emoji: '🚀' },
  { text: 'Dark mode is a lifestyle', emoji: '🌙' },
  { text: 'git commit -m "fixed everything"', emoji: '🔧' },
  { text: 'Fuelled by deadlines and determination', emoji: '⚡' },
  { text: 'No bugs were harmed in this deployment', emoji: '🐛' },
  { text: 'Northwind Workspace — where work flows', emoji: '🌿' },
]

// Separator between items
const SEP = <span className="mq-sep" aria-hidden="true">✦</span>

// Build one full strip — items + separators
function Strip() {
  return (
    <div className="mq-strip" aria-hidden="true">
      {ITEMS.map((item, i) => (
        <span key={i} className="mq-item">
          <span className="mq-emoji">{item.emoji}</span>
          <span className="mq-text">{item.text}</span>
          {SEP}
        </span>
      ))}
    </div>
  )
}

export default function MarqueeFooter() {
  return (
    <footer className="mq-footer" role="contentinfo" aria-label="Status marquee">
      {/* Glow line at top */}
      <div className="mq-glow-line" aria-hidden="true" />

      <div className="mq-track">
        {/* Two identical strips — second one creates the seamless loop */}
        <Strip />
        <Strip />
      </div>
    </footer>
  )
}
