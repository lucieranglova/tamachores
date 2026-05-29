import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'
import { useGame } from '../contexts/GameContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

const customFont = { fontFamily: "'Press Start 2P', cursive", fontSize: 6 }

export default function Stats() {
  const { stats } = useGame()
  const { auth } = useAuth()

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: 32, fontSize: 7, color: 'var(--text-muted)' }}>
        Načítám statistiky...
      </div>
    )
  }

  const { player1, player2, days_labels } = stats

  const chartData = days_labels.map((day, i) => ({
    name: day,
    [player1.username]: player1.daily_points[i] ?? 0,
    [player2.username]: player2.daily_points[i] ?? 0,
  }))

  function PlayerCard({ p, color }) {
    const isMe = p.username === auth?.username
    const bg = color === 'pink' ? 'var(--pink)' : 'var(--blue)'

    return (
      <div className="stats-card">
        <div className="stats-card-header" style={{ background: isMe ? 'var(--border)' : '#666' }}>
          {p.username.toUpperCase()} {isMe ? '(TY)' : ''}
        </div>
        <div className="stats-card-body">
          <div className="stats-row">
            <span>Dnes</span>
            <span className="stats-val">{p.today_points} pts</span>
          </div>
          <div className="stats-row">
            <span>Tento týden</span>
            <span className="stats-val">{p.week_points} pts</span>
          </div>
          <div className="stats-row">
            <span>Celkem</span>
            <span className="stats-val">{p.total_points} pts</span>
          </div>
          <div className="stats-row">
            <span>K útratě</span>
            <span className="stats-val" style={{ color: 'var(--blue-dark)' }}>{p.spendable_points} pts</span>
          </div>
          <div className="stats-row">
            <span>
              <span className="streak-flame">🔥</span> Streak
            </span>
            <span className="stats-val">{p.current_streak} dní</span>
          </div>
          {p.streak_bonus_active && (
            <div style={{ fontSize: 6, color: '#FF8C00', marginTop: 4, textAlign: 'center' }}>
              ★ STREAK BONUS AKTIVNÍ! ★
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="header">
        <span style={{ fontSize: 10 }}>📊 STATISTIKY</span>
      </div>
      <div className="stats-page">
        {/* Chart */}
        <div className="stats-card">
          <div className="stats-card-header">BODY ZA 7 DNÍ</div>
          <div style={{ padding: '10px 0' }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                <XAxis dataKey="name" tick={customFont} />
                <YAxis tick={customFont} />
                <Tooltip
                  contentStyle={{ fontFamily: "'Press Start 2P', cursive", fontSize: 7 }}
                />
                <Legend
                  wrapperStyle={{ fontFamily: "'Press Start 2P', cursive", fontSize: 7 }}
                />
                <Bar dataKey={player1.username} fill="var(--pink-dark)" name={player1.username} />
                <Bar dataKey={player2.username} fill="var(--blue-dark)" name={player2.username} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Player cards */}
        <PlayerCard p={player1} color="pink" />
        <PlayerCard p={player2} color="blue" />
      </div>
    </div>
  )
}
