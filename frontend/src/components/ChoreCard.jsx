import { useState } from 'react'

const ICONS = {
  vacuum: '🧹', dishes: '🍽️', kitchen: '🍴', trash: '🗑️',
  dinner: '🍲', breakfast: '☕', plants: '🌿', dust: '✨',
  laundry: '👕', hang_laundry: '🧺', iron: '👔', toilet: '🚽',
  bathroom: '🛁', mop: '🫧', groceries: '🛒', recycling: '♻️',
  windows: '🪟', fridge: '🧊', storage: '📦', oven: '🔥',
  custom: '⭐', default: '✓',
}

const FREQ = { daily: 'DEN', weekly: 'TÝD', monthly: 'MĚS' }

export default function ChoreCard({ chore, onClaim, currentUserId }) {
  const [busy, setBusy] = useState(false)

  const max = chore.max_per_period ?? 1
  const done = chore.claims_in_period ?? 0
  const isFull = done >= max
  const isMulti = max > 1

  async function handleClick() {
    if (isFull || busy) return
    setBusy(true)
    try {
      await onClaim(chore.id)
    } catch (e) {
      alert(e.message || 'Nelze splnit úkol')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`chore-card${isFull ? ' claimed' : ''}`}
      onClick={handleClick}
      role="button"
      aria-disabled={isFull}
      style={{ opacity: busy ? 0.6 : undefined, position: 'relative' }}
    >
      <div className="chore-icon">{ICONS[chore.icon_key] ?? chore.icon_key ?? ICONS.default}</div>
      <div className="chore-name">{chore.name}</div>
      <div className="chore-pts">{chore.points}pts</div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <div className={`freq-badge ${chore.reset_type}`}>{FREQ[chore.reset_type]}</div>
        {isMulti && (
          <div style={{
            fontSize: 5,
            padding: '1px 3px',
            border: '1px solid var(--border)',
            background: isFull ? 'var(--cream-dark)' : '#FFF9C4',
            fontFamily: 'var(--font)',
          }}>
            {done}/{max}
          </div>
        )}
      </div>
      {isFull && (
        <div className="claimed-label">✓ {chore.claimed_by}</div>
      )}
      {!isFull && done > 0 && isMulti && (
        <div className="claimed-label" style={{ color: '#4CAF50' }}>
          {done}× splněno
        </div>
      )}
    </div>
  )
}
