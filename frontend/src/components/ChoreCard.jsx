import { useState } from 'react'

const ICONS = {
  vacuum: '🧹', dishes: '🍽️', kitchen: '🍴', trash: '🗑️',
  dinner: '🍲', breakfast: '☕', plants: '🌿', dust: '✨',
  laundry: '👕', hang_laundry: '🧺', iron: '👔', toilet: '🚽',
  bathroom: '🛁', mop: '🫧', groceries: '🛒', recycling: '♻️',
  windows: '🪟', fridge: '🧊', storage: '📦', oven: '🔥',
  custom: '⭐', default: '✓',
}

const FREQ = {
  daily: 'DEN',
  weekly: 'TÝD',
  monthly: 'MĚS',
}

export default function ChoreCard({ chore, onClaim, currentUserId, showBubble }) {
  const [busy, setBusy] = useState(false)
  const isClaimed = chore.claimed_by_id !== null
  const isMyChore = chore.claimed_by_id === currentUserId

  async function handleClick() {
    if (isClaimed || busy) return
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
      className={`chore-card${isClaimed ? ' claimed' : ''}${isMyChore ? ' my-claim' : ''}`}
      onClick={handleClick}
      role="button"
      aria-disabled={isClaimed}
      style={{ position: 'relative', opacity: busy ? 0.6 : undefined }}
    >
      {showBubble && (
        <div className="speech-bubble">+{chore._lastPts}pts{chore._isCrit ? ' ★' : ''}</div>
      )}
      <div className="chore-icon">{ICONS[chore.icon_key] || ICONS.default}</div>
      <div className="chore-name">{chore.name}</div>
      <div className="chore-pts">{chore.points}pts</div>
      <div className={`freq-badge ${chore.reset_type}`}>{FREQ[chore.reset_type]}</div>
      {isClaimed && (
        <div className="claimed-label">✓ {chore.claimed_by}</div>
      )}
    </div>
  )
}
