import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { api, createWebSocket } from '../api.js'
import { useAuth } from './AuthContext.jsx'

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const { auth } = useAuth()
  const [chores, setChores] = useState([])
  const [stats, setStats] = useState(null)
  const [me, setMe] = useState(null)
  const [lastClaim, setLastClaim] = useState(null)  // { chore_name, points_earned, is_crit, combo_mult }
  const [loading, setLoading] = useState(false)
  const wsRef = useRef(null)
  const pollRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!auth) return
    try {
      const [c, s, m] = await Promise.all([api.getChores(), api.getStats(), api.getMe()])
      setChores(c)
      setStats(s)
      setMe(m)
    } catch (e) {
      if (e.status === 401) return
      console.warn('Refresh failed:', e)
    }
  }, [auth])

  // Initial load + polling
  useEffect(() => {
    if (!auth) {
      setChores([])
      setStats(null)
      setMe(null)
      return
    }
    refresh()
    pollRef.current = setInterval(refresh, 5000)
    return () => clearInterval(pollRef.current)
  }, [auth, refresh])

  // WebSocket for instant updates
  useEffect(() => {
    if (!auth) return
    let ws
    let reconnectTimer

    function connect() {
      ws = createWebSocket((msg) => {
        if (msg.type === 'chore_claimed') {
          refresh()
        }
      })
      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000)
      }
      wsRef.current = ws
    }

    connect()
    return () => {
      clearTimeout(reconnectTimer)
      if (ws) ws.close()
    }
  }, [auth, refresh])

  const claimChore = useCallback(async (choreId) => {
    setLoading(true)
    try {
      const result = await api.claimChore(choreId)
      setLastClaim(result)
      await refresh()
      return result
    } finally {
      setLoading(false)
    }
  }, [refresh])

  const clearLastClaim = useCallback(() => setLastClaim(null), [])

  return (
    <GameContext.Provider value={{ chores, stats, me, lastClaim, loading, refresh, claimChore, clearLastClaim }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  return useContext(GameContext)
}
