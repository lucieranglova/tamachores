import { useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'
import { useGame } from '../contexts/GameContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Shop() {
  const { me, refresh } = useGame()
  const { auth } = useAuth()
  const [rewards, setRewards] = useState([])
  const [newName, setNewName] = useState('')
  const [newCost, setNewCost] = useState('')
  const [msg, setMsg] = useState('')

  const loadRewards = useCallback(async () => {
    try {
      setRewards(await api.getRewards())
    } catch {}
  }, [])

  useEffect(() => { loadRewards() }, [loadRewards])

  async function addReward(e) {
    e.preventDefault()
    if (!newName.trim() || !newCost) return
    try {
      await api.createReward({ name: newName.trim(), point_cost: Number(newCost) })
      setNewName('')
      setNewCost('')
      await loadRewards()
    } catch (err) {
      setMsg(err.message)
    }
  }

  async function deleteReward(id) {
    if (!confirm('Smazat odměnu?')) return
    try {
      await api.deleteReward(id)
      await loadRewards()
    } catch (err) {
      setMsg(err.message)
    }
  }

  async function redeem(id, cost) {
    if ((me?.spendable_points ?? 0) < cost) {
      setMsg('Nedostatek bodů!')
      setTimeout(() => setMsg(''), 2000)
      return
    }
    try {
      await api.redeemReward(id)
      setMsg('✓ Odměna uplatněna!')
      setTimeout(() => setMsg(''), 2000)
      await refresh()
    } catch (err) {
      setMsg(err.message)
    }
  }

  const spendable = me?.spendable_points ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="header">
        <span style={{ fontSize: 10 }}>🎁 ODMĚNY</span>
      </div>
      <div className="screen">
        <div className="shop-page">
          {/* Balance */}
          <div className="shop-balance">
            <div style={{ fontSize: 8, marginBottom: 4 }}>TVŮJ ZŮSTATEK</div>
            <div style={{ fontSize: 16 }}>{spendable} pts</div>
          </div>

          {msg && (
            <div style={{
              fontFamily: 'var(--font)', fontSize: 7, textAlign: 'center',
              padding: 8, border: '2px solid var(--border)', background: '#E8F5E9'
            }}>
              {msg}
            </div>
          )}

          {/* Add reward form */}
          <form className="add-form" onSubmit={addReward}>
            <div style={{ fontFamily: 'var(--font)', fontSize: 7, marginBottom: 4 }}>
              NOVÁ ODMĚNA
            </div>
            <input
              className="input"
              placeholder="Název odměny"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
            />
            <div className="add-form-row">
              <input
                className="input"
                type="number"
                min="1"
                placeholder="Cena (pts)"
                value={newCost}
                onChange={e => setNewCost(e.target.value)}
                required
              />
              <button className="btn btn-primary btn-sm" type="submit">+PŘIDAT</button>
            </div>
          </form>

          {/* Reward list */}
          {rewards.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: 7, color: 'var(--text-muted)', padding: 16, lineHeight: 2 }}>
              Žádné odměny.<br />Přidej si svoji!
            </div>
          ) : (
            <div className="reward-list">
              {rewards.map(r => (
                <div key={r.id} className="reward-card">
                  <div className="reward-name">{r.name}</div>
                  <div className="reward-cost">{r.point_cost}pts</div>
                  <button
                    className="btn btn-blue btn-sm"
                    onClick={() => redeem(r.id, r.point_cost)}
                    disabled={spendable < r.point_cost}
                  >
                    ✓
                  </button>
                  {r.created_by === auth?.playerId && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteReward(r.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
