'use client'

import { useState, useRef, useCallback } from 'react'
import { Plus, Minus } from 'lucide-react'

const FLOWER_COLORS = ['#ff6b9d', '#ffd23f', '#ff8c42', '#a685e2', '#ff6b9d']
const FLOWER_POSITIONS: [number, number][] = [[40, 220], [90, 230], [150, 222], [175, 235], [60, 238]]
const SUN_RAYS = [0, 45, 90, 135, 180, 225, 270, 315]

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

type Point = { x: number; y: number }
const pointDistance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

export default function FloatingCanvas2D() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  const ref = useRef<HTMLDivElement>(null)

  // Tracks every pointer currently touching the canvas, keyed by pointerId — lets us
  // detect a second simultaneous pointer and treat the pair as a pinch gesture.
  const activePointers = useRef(new Map<number, Point>())
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null)

  const updateTilt = useCallback((clientX: number, clientY: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (clientX - rect.left) / rect.width - 0.5
    const py = (clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -16, y: px * 18 })
  }, [])

  const adjustZoom = useCallback((delta: number) => {
    setZoomScale((z) => clamp(Math.round((z + delta) * 100) / 100, MIN_ZOOM, MAX_ZOOM))
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    setZoomScale((z) => clamp(z - e.deltaY * 0.0016, MIN_ZOOM, MAX_ZOOM))
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.current.size === 2) {
      const [a, b] = Array.from(activePointers.current.values())
      pinchRef.current = { distance: pointDistance(a, b), zoom: zoomScale }
      setActive(false)
    } else if (activePointers.current.size === 1) {
      setActive(true)
      updateTilt(e.clientX, e.clientY)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(e.pointerId)) return
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.current.size === 2 && pinchRef.current) {
      const [a, b] = Array.from(activePointers.current.values())
      const ratio = pointDistance(a, b) / pinchRef.current.distance
      setZoomScale(clamp(pinchRef.current.zoom * ratio, MIN_ZOOM, MAX_ZOOM))
    } else if (activePointers.current.size === 1) {
      setActive(true)
      updateTilt(e.clientX, e.clientY)
    }
  }

  const releasePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size < 2) pinchRef.current = null
    if (activePointers.current.size === 0) {
      setActive(false)
      setTilt({ x: 0, y: 0 })
    }
  }

  // Derived stage scales — the pedestal shadow grows/shrinks with the artwork to stay
  // grounded, while the ambient glow expands as the canvas shrinks so the surrounding
  // "empty space" still reads as a lit, three-dimensional stage rather than a void.
  const pedestalScale = 1 + (zoomScale - 1) * 0.28
  const ambientScale = 1 + Math.max(0, 1 - zoomScale) * 0.6

  return (
    <div className="relative w-full h-full flex items-center justify-center px-8" style={{ perspective: '1500px' }}>
      {/* Ambient stage glow — fills the empty space as the artwork is zoomed out, keeping
          the pedestal feeling lit and three-dimensional rather than empty */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none -z-20 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `scale(${ambientScale})` }}
      >
        <div
          className="w-2/3 aspect-square rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 70%)' }}
        />
      </div>

      <div
        ref={ref}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerLeave={releasePointer}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onWheel={handleWheel}
        className={`relative w-full max-w-xs aspect-[4/5] cursor-grab active:cursor-grabbing touch-none transition-transform ${
          active ? 'duration-100 ease-out' : 'duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${zoomScale + (active ? 0.02 : 0)})`,
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

        {/* Floating drop shadow / pedestal — scales up slightly with zoom for a sense of physical depth */}
        <div
          className={`absolute -bottom-7 inset-x-10 h-7 rounded-full blur-xl -z-10 transition-transform ${
            active ? 'duration-100 ease-out' : 'duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'
          }`}
          style={{
            background: 'rgba(0,0,0,0.32)',
            transform: `translateX(${tilt.y * -1.6}px) scale(${pedestalScale}) scaleX(${1 - Math.min(Math.abs(tilt.y) * 0.012, 0.25)})`,
          }}
        />
      </div>

      {/* Zoom controls — corner overlay alternative to wheel / pinch gestures */}
      <div className="absolute bottom-5 right-5 z-10 flex flex-col items-stretch gap-0.5 bg-black/55 backdrop-blur-sm border border-white/10 rounded-2xl p-1.5">
        <button
          onClick={() => adjustZoom(ZOOM_STEP)}
          disabled={zoomScale >= MAX_ZOOM}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
        <span className="text-center text-white/50 text-[10px] font-mono py-0.5 select-none tabular-nums">
          {Math.round(zoomScale * 100)}%
        </span>
        <button
          onClick={() => adjustZoom(-ZOOM_STEP)}
          disabled={zoomScale <= MIN_ZOOM}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
