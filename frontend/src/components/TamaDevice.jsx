import { useEffect, useRef, useState } from 'react'

// Pixel art sprites — 12 wide × 11 tall
// 0 = transparent, 1 = body, 2 = feature (eyes/mouth)
const HAPPY_SPRITE = [
  [0,0,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,0,2,2,1,1,2,2,0,1,1],
  [1,1,0,2,2,1,1,2,2,0,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,2,1,1,1,1,1,1,2,1,1],
  [1,1,1,2,2,2,2,2,2,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,0,0,0,0,1,1,0,0],
  [0,0,1,0,0,0,0,0,0,1,0,0],
]

const SAD_SPRITE = [
  [0,0,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,0,2,2,1,1,2,2,0,1,1],
  [1,1,0,2,2,1,1,2,2,0,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,2,2,2,2,2,2,1,1,1],
  [1,1,2,1,1,1,1,1,1,2,1,1],
  [0,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,0,0,0,0,1,1,0,0],
  [0,0,1,0,0,0,0,0,0,1,0,0],
]

const PIXEL = 5  // px per sprite pixel

function drawCreature(ctx, sprite, bodyColor, featureColor) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const val = sprite[row][col]
      if (val === 0) continue
      ctx.fillStyle = val === 2 ? featureColor : bodyColor
      ctx.fillRect(col * PIXEL, row * PIXEL, PIXEL, PIXEL)
    }
  }
}

export default function TamaDevice({ player, color = 'pink', todayPoints = 0, dailyTotal = 0, isCurrentUser = false }) {
  const canvasRef = useRef(null)
  const [bounce, setBounce] = useState(0)

  const isHappy = todayPoints > 0
  const moodPct = dailyTotal > 0 ? Math.min(1, todayPoints / dailyTotal) : 0
  const moodColor = moodPct >= 0.75 ? '#4CAF50' : moodPct >= 0.25 ? '#FF9800' : '#F44336'

  const eggColor = color === 'pink' ? 'var(--pink-egg)' : 'var(--blue-egg)'
  const eggBorder = color === 'pink' ? 'var(--pink-dark)' : 'var(--blue-dark)'

  // Draw creature
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false

    const sprite = isHappy ? HAPPY_SPRITE : SAD_SPRITE
    drawCreature(ctx, sprite, '#306230', '#0F380F')
  }, [isHappy])

  // Bounce animation
  useEffect(() => {
    let frame = 0
    const id = setInterval(() => {
      frame++
      setBounce(Math.sin(frame * 0.15) * 3)
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
      {/* Mood dot */}
      <div style={{
        width: 8, height: 8,
        borderRadius: '50%',
        background: moodColor,
        border: '2px solid var(--border)',
        position: 'absolute',
        top: 6, right: 6,
        zIndex: 2,
        boxShadow: '0 0 4px ' + moodColor,
      }} />

      {/* Egg shell */}
      <div style={{
        width: 130,
        height: 160,
        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        background: `radial-gradient(ellipse at 35% 30%, white 0%, ${eggColor} 50%, ${eggBorder} 100%)`,
        border: `4px solid var(--border)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 20,
        gap: 8,
        boxShadow: `4px 4px 0 var(--border), inset -3px -4px 8px rgba(0,0,0,0.1)`,
        position: 'relative',
      }}>
        {/* LCD screen */}
        <div style={{
          width: 90,
          height: 80,
          background: '#9BB33A',
          border: '3px solid var(--border)',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          flexDirection: 'column',
          gap: 2,
        }}>
          {/* Creature canvas */}
          <canvas
            ref={canvasRef}
            width={12 * PIXEL}
            height={11 * PIXEL}
            style={{
              imageRendering: 'pixelated',
              transform: `translateY(${bounce}px)`,
            }}
          />
          {/* Points display */}
          <div style={{
            fontFamily: 'var(--font)',
            fontSize: 6,
            color: '#0F380F',
            background: '#8BAC0F',
            padding: '1px 4px',
            lineHeight: 1,
          }}>
            {todayPoints}pts
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: i === 1 ? eggBorder : '#444',
              border: '2px solid var(--border)',
              boxShadow: '1px 1px 0 var(--border)',
            }} />
          ))}
        </div>
      </div>

      {/* Player label */}
      <div style={{
        fontFamily: 'var(--font)',
        fontSize: 7,
        background: isCurrentUser ? eggBorder : 'var(--border)',
        color: 'white',
        padding: '2px 8px',
        border: '2px solid var(--border)',
      }}>
        {player?.username || '---'}
        {isCurrentUser && ' ★'}
      </div>
    </div>
  )
}
