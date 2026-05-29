import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { GameProvider } from './contexts/GameContext.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Stats from './pages/Stats.jsx'
import Shop from './pages/Shop.jsx'
import Settings from './pages/Settings.jsx'
import TabBar from './components/TabBar.jsx'

function Inner() {
  const { auth } = useAuth()
  const [tab, setTab] = useState('home')

  if (!auth) return <Login />

  const pages = {
    home: <Home />,
    stats: <Stats />,
    shop: <Shop />,
    settings: <Settings />,
  }

  return (
    <GameProvider>
      <div className="app">
        {pages[tab]}
        <TabBar active={tab} onChange={setTab} />
      </div>
    </GameProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  )
}
