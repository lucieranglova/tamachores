import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err.message || 'Přihlášení selhalo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-egg">🥚</div>
      <div className="login-title">TAMA<br />CHORES</div>

      <form className="login-form" onSubmit={handleSubmit}>
        <div>
          <label>HRÁČ</label>
          <input
            className="input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="player1 / player2"
            autoCapitalize="none"
            autoCorrect="off"
            required
          />
        </div>
        <div>
          <label>HESLO</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        {error && <div className="login-error">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'NAČÍTÁM...' : 'HRÁT ▶'}
        </button>
      </form>

      <div style={{ fontSize: 6, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 2 }}>
        výchozí: player1 / tamachores1<br />
        player2 / tamachores2
      </div>
    </div>
  )
}
