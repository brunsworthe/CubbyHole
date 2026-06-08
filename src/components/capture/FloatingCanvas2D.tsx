'use client'

import { useState, useRef, useCallback } from 'react'

const FLOWER_COLORS = ['#ff6b9d', '#ffd23f', '#ff8c42', '#a685e2', '#ff6b9d']
const FLOWER_POSITIONS: [number, number][] = [[40, 220], [90, 230], [150, 222], [175, 235], [60, 238]]
const SUN_RAYS = [0, 45, 90, 135, 180, 225, 270, 315]

export default function FloatingCanvas2D() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const updateTilt = useCallback((clientX: number, clientY: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (clientX - rect.left) / rect.width - 0.5
    const py = (clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -16, y: px * 18 })
  }, [])

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    setActive(true)
    updateTilt(e.clientX, e.clientY)
  }
  const handleLeave = () => {
    setActive(false)
    setTilt({ x: 0, y: 0 })
  }

  return (
    <div className="w-full h-full flex items-center justify-center px-8" style={{ perspective: '1500px' }}>
      <div
        ref={ref}
        onPointerMove={handleMove}
        onPointerDown={handleMove}
        onPointerLeave={handleLeave}
        onPointerUp={handleLeave}
        className="relative w-full max-w-xs aspect-[4/5] cursor-grab active:cursor-grabbing touch-none"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${active ? 1.025 : 1})`,
          transition: active ? 'transform 90ms ease-out' : 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Frame */}
        <div
          className="absolute inset-0 rounded-2xl shadow-2xl p-3.5"
          style={{
            transform: 'translateZ(0px)',
            background: 'linear-gradient(135deg, #d8b48a 0%, #b8895f 50%, #96694a 100%)',
          }}
        >
          {/* Mat board */}
          <div className="w-full h-full rounded-lg p-3 shadow-inner" style={{ background: '#f4efe6' }}>
            {/* Canvas — layered artwork for parallax depth */}
            <div className="relative w-full h-full rounded overflow-hidden">
              {/* Layer 1 — sky, sun, clouds */}
              <div className="absolute inset-0" style={{ transform: 'translateZ(8px)' }}>
                <svg viewBox="0 0 200 250" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <linearGradient id="fc-sky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9bd5f0" />
                      <stop offset="100%" stopColor="#eaf7ff" />
                    </linearGradient>
                  </defs>
                  <rect width="200" height="250" fill="url(#fc-sky)" />
                  <circle cx="158" cy="48" r="22" fill="#ffd23f" stroke="#ffb700" strokeWidth="2" />
                  {SUN_RAYS.map((deg) => (
                    <line key={deg}
                      x1={158 + 28 * Math.cos((deg * Math.PI) / 180)}
                      y1={48 + 28 * Math.sin((deg * Math.PI) / 180)}
                      x2={158 + 38 * Math.cos((deg * Math.PI) / 180)}
                      y2={48 + 38 * Math.sin((deg * Math.PI) / 180)}
                      stroke="#ffb700" strokeWidth="3" strokeLinecap="round"
                    />
                  ))}
                  <ellipse cx="58" cy="44" rx="22" ry="12" fill="white" opacity="0.85" />
                  <ellipse cx="76" cy="39" rx="16" ry="10" fill="white" opacity="0.85" />
                </svg>
              </div>

              {/* Layer 2 — house and tree */}
              <div className="absolute inset-0" style={{ transform: 'translateZ(26px)' }}>
                <svg viewBox="0 0 200 250" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                  <rect x="26" y="148" width="12" height="52" fill="#8b5a2b" rx="2" />
                  <circle cx="32" cy="132" r="27" fill="#5fae5f" />
                  <circle cx="17" cy="148" r="19" fill="#6abf6a" />
                  <circle cx="48" cy="148" r="19" fill="#6abf6a" />
                  <rect x="95" y="150" width="70" height="58" fill="#f4a259" stroke="#d6873a" strokeWidth="2" />
                  <path d="M 90 150 L 130 110 L 170 150 Z" fill="#c1453d" stroke="#a3372f" strokeWidth="2" />
                  <rect x="120" y="180" width="20" height="28" fill="#6b4226" />
                  <rect x="105" y="164" width="14" height="14" fill="#bfe6ff" stroke="#8fb8d6" strokeWidth="1.5" />
                  <rect x="142" y="164" width="14" height="14" fill="#bfe6ff" stroke="#8fb8d6" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Layer 3 — grass and flowers (closest to viewer) */}
              <div className="absolute inset-0" style={{ transform: 'translateZ(44px)' }}>
                <svg viewBox="0 0 200 250" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                  <path d="M 0 205 Q 50 195 100 205 T 200 205 L 200 250 L 0 250 Z" fill="#7bc25f" />
                  {FLOWER_POSITIONS.map(([x, y], i) => {
                    const c = FLOWER_COLORS[i]
                    return (
                      <g key={i}>
                        <line x1={x} y1={y + 3} x2={x} y2={y + 11} stroke="#5a9c45" strokeWidth="1.5" />
                        <circle cx={x} cy={y} r="4" fill={c} />
                        <circle cx={x - 4} cy={y - 1} r="2.4" fill={c} opacity="0.7" />
                        <circle cx={x + 4} cy={y - 1} r="2.4" fill={c} opacity="0.7" />
                        <circle cx={x} cy={y - 4} r="2.4" fill={c} opacity="0.7" />
                        <circle cx={x} cy={y} r="1.4" fill="#fff6d6" />
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Glare / sheen overlay — drifts opposite the tilt for a glassy feel */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  transform: `translateZ(62px) translate(${tilt.y * 1.4}px, ${tilt.x * 1.4}px)`,
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.38) 0%, transparent 38%, transparent 62%, rgba(255,255,255,0.10) 100%)',
                  mixBlendMode: 'overlay',
                }}
              />
            </div>
          </div>
        </div>

        {/* Floating drop shadow that reacts to tilt */}
        <div
          className="absolute -bottom-7 inset-x-10 h-7 rounded-full blur-xl -z-10"
          style={{
            background: 'rgba(0,0,0,0.32)',
            transform: `translateX(${tilt.y * -1.6}px) scaleX(${1 - Math.min(Math.abs(tilt.y) * 0.012, 0.25)})`,
          }}
        />
      </div>
    </div>
  )
}
