import { useState, useEffect, useCallback } from 'react'
import TamaDevice from '../components/TamaDevice.jsx'
import ChoreCard from '../components/ChoreCard.jsx'
import CritFlash from '../components/CritFlash.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useGame } from '../contexts/GameContext.jsx'

const SECTION_ORDER = ['daily', 'weekly', 'monthly']
const SECTION_LABELS = { daily: '📅 DENNÍ', weekly: '📆 TÝDENNÍ', monthly: '🗓️ MĚSÍČNÍ' }

export default function Home() {
  const { auth } = useAuth()
  const { chores, stats, me, lastClaim, claimChore, clearLastClaim } = useGame()
  const [showCrit, setShowCrit] = useState(false)
  const [bubbleChoreId, setBubbleChoreId] = useState(null)

  useEffect(() => {
    if (!lastClaim) return
    if (lastClaim.is_crit) setShowCrit(true)
    setBubbleChoreId(null)
    // We don't have chore_id in lastClaim directly; mark via chore name match
    clearLastClaim()
  }, [lastClaim])

  const handleClaim = useCallback(async (choreId) => {
    const result = await claimChore(choreId)
    if (result.is_crit) setShowCrit(true)
    return result
  }, [claimChore])

  // Build section groups
  const byType = { daily: [], weekly: [], monthly: [] }
  chores.forEach(c => { if (byType[c.reset_type]) byType[c.reset_type].push(c) })

  // Player stats from stats response
  const p1Stats = stats?.player1
  const p2Stats = stats?.player2
  const myStats = p1Stats?.username === auth?.username ? p1Stats : p2Stats
  const partnerStats = p1Stats?.username === auth?.username ? p2Stats : p1Stats

  // Daily chores total for mood
  const dailyChores = byType.daily
  const dailyTotal = dailyChores.reduce((s, c) => s + c.points, 0)
  const myDailyPts = myStats?.today_points ?? 0
  const partnerDailyPts = partnerStats?.today_points ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <CritFlash show={showCrit} onDone={() => setShowCrit(false)} points={lastClaim?.points_earned} />

      <div className="header">
        <span style={{ fontSize: 10 }}>🥚 TAMACHORES</span>
        <span style={{ fontSize: 7, color: 'var(--text-muted)' }}>
          {me ? `${me.spendable_points}pts` : ''}
        </span>
      </div>

      {/* Egg devices */}
      <div className="devices-row">
        <TamaDevice
          player={{ username: auth?.displayName || auth?.username }}
          color={auth?.username === 'player1' ? 'pink' : 'blue'}
          todayPoints={myDailyPts}
          dailyTotal={dailyTotal}
          isCurrentUser={true}
        />
        <TamaDevice
          player={{ username: partnerStats?.username || 'partner' }}
          color={auth?.username === 'player1' ? 'blue' : 'pink'}
          todayPoints={partnerDailyPts}
          dailyTotal={dailyTotal}
          isCurrentUser={false}
        />
      </div>

      {/* Streak bonus indicator */}
      {myStats?.streak_bonus_active && (
        <div style={{
          background: '#FF8C00',
          color: 'white',
          fontFamily: 'var(--font)',
          fontSize: 7,
          textAlign: 'center',
          padding: '4px',
          borderBottom: '2px solid var(--border)',
        }}>
          🔥 STREAK BONUS AKTIVNÍ! +20% BODŮ
        </div>
      )}

      {/* Chore sections */}
      <div className="screen">
        {SECTION_ORDER.map(type => {
          const sectionChores = byType[type]
          if (sectionChores.length === 0) return null
          const claimed = sectionChores.filter(c => c.claimed_by_id !== null).length
          return (
            <div key={type} className="chore-section">
              <div className="chore-section-header">
                <span className="section-label">{SECTION_LABELS[type]}</span>
                <span style={{ fontSize: 6, color: 'var(--text-muted)' }}>
                  {claimed}/{sectionChores.length}
                </span>
              </div>
              <div className="chore-grid">
                {sectionChores.map(chore => (
                  <ChoreCard
                    key={chore.id}
                    chore={chore}
                    onClaim={handleClaim}
                    currentUserId={auth?.playerId}
                  />
                ))}
              </div>
            </div>
          )
        })}
        {chores.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, fontSize: 7, color: 'var(--text-muted)', lineHeight: 2 }}>
            Načítám úkoly...
          </div>
        )}
      </div>
    </div>
  )
}
