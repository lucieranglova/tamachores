import { useEffect, useState } from 'react'

export default function CritFlash({ show, onDone, points }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const t = setTimeout(() => {
        setVisible(false)
        onDone?.()
      }, 1200)
      return () => clearTimeout(t)
    }
  }, [show])

  if (!visible) return null

  return (
    <div className="crit-overlay">
      <div className="crit-box">
        <span className="crit-title">★ CRIT! ★</span>
        <span className="crit-sub">x2 BODY POINTS!</span>
        {points && <span style={{ display: 'block', marginTop: 8, fontSize: 8 }}>+{points} pts</span>}
      </div>
    </div>
  )
}
