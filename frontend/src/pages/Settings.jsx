import { useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useGame } from '../contexts/GameContext.jsx'

const SECTION_LABELS = { daily: 'Denní', weekly: 'Týdenní', monthly: 'Měsíční' }
const RESET_TYPES = ['daily', 'weekly', 'monthly']

export default function Settings() {
  const { auth, logout } = useAuth()
  const { refresh } = useGame()
  const [allChores, setAllChores] = useState([])
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [choreMsg, setChoreMsg] = useState('')

  // New chore form
  const [newName, setNewName] = useState('')
  const [newPts, setNewPts] = useState('')
  const [newType, setNewType] = useState('daily')

  const loadAll = useCallback(async () => {
    try {
      setAllChores(await api.getAllChores())
    } catch {}
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  async function toggleChore(id) {
    try {
      await api.toggleChore(id)
      await loadAll()
      await refresh()
    } catch (e) {
      setChoreMsg(e.message)
    }
  }

  async function deleteChore(id) {
    if (!confirm('Smazat vlastní úkol?')) return
    try {
      await api.deleteChore(id)
      await loadAll()
      await refresh()
    } catch (e) {
      setChoreMsg(e.message)
    }
  }

  async function addChore(e) {
    e.preventDefault()
    if (!newName.trim() || !newPts) return
    try {
      await api.createChore({ name: newName.trim(), points: Number(newPts), reset_type: newType })
      setNewName('')
      setNewPts('')
      setChoreMsg('Úkol přidán!')
      setTimeout(() => setChoreMsg(''), 2000)
      await loadAll()
      await refresh()
    } catch (err) {
      setChoreMsg(err.message)
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwMsg('')
    try {
      await api.changePassword(currentPw, newPw)
      setPwMsg('Heslo změněno!')
      setCurrentPw('')
      setNewPw('')
    } catch (err) {
      setPwMsg(err.message)
    }
    setTimeout(() => setPwMsg(''), 3000)
  }

  const grouped = RESET_TYPES.reduce((acc, t) => {
    acc[t] = allChores.filter(c => c.reset_type === t)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="header">
        <span style={{ fontSize: 10 }}>⚙️ NASTAVENÍ</span>
        <span style={{ fontSize: 7, color: 'var(--text-muted)' }}>{auth?.username}</span>
      </div>
      <div className="screen">
        <div className="settings-page">

          {/* Add custom chore */}
          <div className="settings-section">
            <div className="settings-section-title">PŘIDAT VLASTNÍ ÚKOL</div>
            <form style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }} onSubmit={addChore}>
              <input className="input" placeholder="Název úkolu" value={newName}
                onChange={e => setNewName(e.target.value)} required />
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" type="number" min="1" placeholder="Body"
                  value={newPts} onChange={e => setNewPts(e.target.value)} required />
                <select className="input" style={{ width: 'auto', minWidth: 80 }}
                  value={newType} onChange={e => setNewType(e.target.value)}>
                  <option value="daily">Denní</option>
                  <option value="weekly">Týdenní</option>
                  <option value="monthly">Měsíční</option>
                </select>
              </div>
              <button className="btn btn-primary btn-sm" type="submit">+ PŘIDAT</button>
              {choreMsg && <div style={{ fontSize: 6, color: 'green' }}>{choreMsg}</div>}
            </form>
          </div>

          {/* Chore toggles by type */}
          {RESET_TYPES.map(type => (
            <div key={type} className="settings-section">
              <div className="settings-section-title">{SECTION_LABELS[type].toUpperCase()} ÚKOLY</div>
              <div className="chore-toggle-list">
                {grouped[type].length === 0 && (
                  <div style={{ padding: 10, fontSize: 6, color: 'var(--text-muted)' }}>Žádné úkoly</div>
                )}
                {grouped[type].map(chore => (
                  <div key={chore.id} className="chore-toggle-item">
                    <span
                      className="chore-toggle-name"
                      style={{ textDecoration: chore.is_active ? 'none' : 'line-through', color: chore.is_active ? 'inherit' : 'var(--text-muted)' }}
                    >
                      {chore.name}
                    </span>
                    <span style={{ fontSize: 6, color: 'var(--text-muted)', marginRight: 4 }}>{chore.points}p</span>
                    <button
                      className={`btn btn-sm ${chore.is_active ? '' : 'btn-primary'}`}
                      onClick={() => toggleChore(chore.id)}
                    >
                      {chore.is_active ? 'VYP' : 'ZAP'}
                    </button>
                    {!chore.is_default && (
                      <button className="btn btn-danger btn-sm" onClick={() => deleteChore(chore.id)}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Change password */}
          <div className="settings-section">
            <div className="settings-section-title">ZMĚNA HESLA</div>
            <form style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }} onSubmit={changePassword}>
              <input className="input" type="password" placeholder="Současné heslo"
                value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
              <input className="input" type="password" placeholder="Nové heslo"
                value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={6} />
              <button className="btn btn-sm" type="submit">ZMĚNIT HESLO</button>
              {pwMsg && <div style={{ fontSize: 6, color: pwMsg.includes('změněno') ? 'green' : 'red' }}>{pwMsg}</div>}
            </form>
          </div>

          {/* Logout */}
          <button className="btn btn-danger" onClick={logout} style={{ width: '100%' }}>
            ODHLÁSIT SE
          </button>

        </div>
      </div>
    </div>
  )
}
