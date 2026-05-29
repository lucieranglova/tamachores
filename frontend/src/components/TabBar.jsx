export default function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'home', icon: '🏠', label: 'HOME' },
    { id: 'stats', icon: '📊', label: 'STATS' },
    { id: 'shop', icon: '🎁', label: 'SHOP' },
    { id: 'settings', icon: '⚙️', label: 'SET' },
  ]

  return (
    <nav className="tab-bar">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`tab ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="tab-icon">{t.icon}</span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
