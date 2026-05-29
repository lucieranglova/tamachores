import { createContext, useContext, useState, useCallback } from 'react'
import { api, registerPush } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token')
    const username = localStorage.getItem('username')
    const displayName = localStorage.getItem('displayName')
    const playerId = localStorage.getItem('playerId')
    return token ? { token, username, displayName: displayName || username, playerId: Number(playerId) } : null
  })

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password)
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('username', data.username)
    localStorage.setItem('displayName', data.display_name || data.username)
    localStorage.setItem('playerId', String(data.player_id))
    setAuth({ token: data.access_token, username: data.username, displayName: data.display_name || data.username, playerId: data.player_id })

    // Request push permission after login
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        await registerPush()
      }
    } else if (Notification.permission === 'granted') {
      await registerPush()
    }
  }, [])

  const setDisplayName = useCallback((name) => {
    localStorage.setItem('displayName', name)
    setAuth(a => ({ ...a, displayName: name }))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('displayName')
    localStorage.removeItem('playerId')
    setAuth(null)
  }, [])

  return (
    <AuthContext.Provider value={{ auth, login, logout, setDisplayName }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
