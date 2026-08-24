'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Lightbulb, Box, Palette, FileText, Mountain, VideoOff, Images, CheckCircle2, Zap, Maximize, Minimize, Plus, Minus, Timer } from 'lucide-react'
import type { CaptureMode, CapturedMedia } from './CaptureFlow'

const MODES: { id: CaptureMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'scan3d',    label: '360° Object',    icon: Box      },
  { id: 'relief180', label: 'Textured Relief', icon: Mountain },
  { id: 'artwork2d', label: '2D Masterpiece',  icon: Palette  },
  { id: 'document',  label: 'Document',        icon: FileText },
]

const SCAN_STEPS = [
  { dir: 'N',  heading: 'Frame 1 / 8 — Front (0°)',        sub: 'Face the front of the object toward the camera'  },
  { dir: 'NE', heading: 'Frame 2 / 8 — Front-Right (45°)', sub: 'Rotate the object 45° clockwise from front'       },
  { dir: 'E',  heading: 'Frame 3 / 8 — Right Side (90°)',  sub: 'Right side of the object now faces the camera'    },
  { dir: 'SE', heading: 'Frame 4 / 8 — Rear-Right (135°)', sub: 'Continue rotating another 45° clockwise'          },
  { dir: 'S',  heading: 'Frame 5 / 8 — Rear View (180°)',  sub: "Object's back now faces the camera"              },
  { dir: 'SW', heading: 'Frame 6 / 8 — Rear-Left (225°)',  sub: 'Continue rotating another 45° clockwise'          },
  { dir: 'W',  heading: 'Frame 7 / 8 — Left Side (270°)',  sub: 'Left side of the object now faces the camera'     },
  { dir: 'NW', heading: 'Frame 8 / 8 — Front-Left (315°)', sub: 'Final frame — almost done!'                       },
] as const

const ORBIT_STEPS = [
  { dir: 'N',  heading: 'Frame 1 / 8 — Front (0°)',        sub: 'Face the exact front of the object.'          },
  { dir: 'NE', heading: 'Frame 2 / 8 — Front-Right (45°)', sub: 'Take a step right. Keep the object centered.' },
  { dir: 'E',  heading: 'Frame 3 / 8 — Right Side (90°)',  sub: 'Take a step right. Keep the object centered.' },
  { dir: 'SE', heading: 'Frame 4 / 8 — Rear-Right (135°)', sub: 'Take a step right. Keep the object centered.' },
  { dir: 'S',  heading: 'Frame 5 / 8 — Rear View (180°)',  sub: 'Take a step right. Keep the object centered.' },
  { dir: 'SW', heading: 'Frame 6 / 8 — Rear-Left (225°)',  sub: 'Take a step right. Keep the object centered.' },
  { dir: 'W',  heading: 'Frame 7 / 8 — Left Side (270°)',  sub: 'Take a step right. Keep the object centered.' },
  { dir: 'NW', heading: 'Frame 8 / 8 — Front-Left (315°)', sub: 'Take a step right. Keep the object centered.' },
] as const

const RELIEF_STEPS = [
  { pos: 'BASE', heading: 'Frame 1/6 — Base Texture',      sub: 'Hold phone flat & parallel directly overhead — capture the full albedo (base colour) before any light raking'  },
  { pos: 'XL',   heading: 'Frame 2/6 — Extreme Left',      sub: 'Tilt phone far left — light rakes across the texture from the right'  },
  { pos: 'LC',   heading: 'Frame 3/6 — Left-Center',        sub: 'Move phone slightly right toward center'                              },
  { pos: 'TD',   heading: 'Frame 4/6 — Top-Down Center',    sub: 'Hold directly above, camera facing straight down at the artwork'      },
  { pos: 'RC',   heading: 'Frame 5/6 — Right-Center',       sub: 'Move phone slightly left of rightmost position'                       },
  { pos: 'XR',   heading: 'Frame 6/6 — Extreme Right',      sub: 'Tilt phone far right — light rakes across from the left'              },
] as const

type CameraStatus = 'requesting' | 'active' | 'denied' | 'unavailable' | 'error'

// Hardware zoom isn't in the standard MediaTrackCapabilities/Settings TS lib types yet
// (same non-standard-field pattern already used for `torch` elsewhere in this file).
type ZoomCapabilities = MediaTrackCapabilities & { zoom?: { min: number; max: number; step: number } }
type ZoomSettings = MediaTrackSettings & { zoom?: number }
type ZoomLimits = { min: number; max: number; step: number }

// ── Compass dial for 8-segment scan3d capture ─────────────────────────────────
function CompassDial({ capturedFrames, currentStep, svgClassName = 'w-40 h-40', isOrbitMode = false }: {
  capturedFrames: (Blob | null)[]
  currentStep: number
  svgClassName?: string
  isOrbitMode?: boolean
}) {
  const cx = 100, cy = 100
  const ro = 84, ri = 46
  const GAP = 3
  const OFFSET = -112.5

  function segPath(i: number) {
    const s = (i * 45 + GAP + OFFSET) * Math.PI / 180
    const e = ((i + 1) * 45 - GAP + OFFSET) * Math.PI / 180
    const x1 = cx + ro * Math.cos(s), y1 = cy + ro * Math.sin(s)
    const x2 = cx + ro * Math.cos(e), y2 = cy + ro * Math.sin(e)
    const x3 = cx + ri * Math.cos(e), y3 = cy + ri * Math.sin(e)
    const x4 = cx + ri * Math.cos(s), y4 = cy + ri * Math.sin(s)
    return `M ${x1} ${y1} A ${ro} ${ro} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${ri} ${ri} 0 0 0 ${x4} ${y4} Z`
  }

  function midPt(i: number, r: number): [number, number] {
    const mid = (i * 45 + 22.5 + OFFSET) * Math.PI / 180
    return [cx + r * Math.cos(mid), cy + r * Math.sin(mid)]
  }

  const allCaptured = currentStep >= 8

  return (
    <svg viewBox="0 0 200 200" className={svgClassName} aria-hidden="true">
      <circle cx={cx} cy={cy} r={ro + 9} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

      {SCAN_STEPS.map((step, i) => {
        const isCaptured = capturedFrames[i] !== null
        const isActive   = i === currentStep && !allCaptured
        const [mx, my]   = midPt(i, (ro + ri) / 2)
        const [lx, ly]   = midPt(i, ro + 13)

        const fill   = isCaptured ? 'rgba(251,191,36,0.50)'
                     : isActive   ? 'rgba(251,191,36,0.88)'
                     :               'rgba(251,191,36,0.18)'
        const stroke = isCaptured ? 'rgba(251,191,36,0.65)'
                     : isActive   ? 'rgba(251,191,36,1)'
                     :               'rgba(251,191,36,0.40)'
        const labelFill = isCaptured ? 'rgba(251,191,36,0.70)'
                        : isActive   ? 'rgba(255,255,255,0.95)'
                        :               'rgba(255,255,255,0.45)'

        return (
          <g key={i}>
            <path d={segPath(i)} fill={fill} stroke={stroke} strokeWidth={isActive ? 1.5 : 1} />
            {isActive && (
              <path d={segPath(i)} fill="none" stroke="rgba(251,191,36,0.4)" strokeWidth="3">
                <animate attributeName="opacity" values="0.7;0;0.7" dur="1.6s" repeatCount="indefinite" />
              </path>
            )}
            {isCaptured && (
              <path
                d={`M ${mx - 4} ${my} L ${mx - 1} ${my + 3} L ${mx + 4.5} ${my - 3.5}`}
                fill="none" stroke="rgba(251,191,36,0.95)" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"
              />
            )}
            <text x={lx} y={ly + 3.5} textAnchor="middle" fill={labelFill}
              fontSize="8.5" fontFamily="monospace" fontWeight={isActive ? 'bold' : 'normal'}>
              {step.dir}
            </text>
          </g>
        )
      })}

      <circle cx={cx} cy={cy} r={ri - 3} fill="rgba(0,0,0,0.55)" />
      <circle cx={cx} cy={cy} r={ri - 3} fill="none" stroke="rgba(251,191,36,0.35)" strokeWidth="1" />

      {allCaptured ? (
        <>
          <text x={cx} y={cy + 5}  textAnchor="middle" fill="rgba(251,191,36,1)" fontSize="18" fontWeight="bold">✓</text>
          <text x={cx} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7.5" fontFamily="monospace">ALL DONE</text>
        </>
      ) : isOrbitMode ? (
        <>
          {/* Fixed object icon: camera orbits around this */}
          <rect x={cx - 9} y={cy - 12} width="18" height="24" rx="3"
            fill="rgba(251,191,36,0.10)" stroke="rgba(251,191,36,0.50)" strokeWidth="1.4" />
          <text x={cx} y={cy + 22} textAnchor="middle" fill="rgba(255,255,255,0.38)" fontSize="7.5" fontFamily="monospace">
            {currentStep + 1}/8
          </text>
        </>
      ) : (
        <>
          {/* Object icon rotates 45° per step to show current face toward camera */}
          <g transform={`rotate(${currentStep * 45} ${cx} ${cy})`}>
            <rect x={cx - 7} y={cy - 10} width="14" height="20" rx="2.5"
              fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.38)" strokeWidth="1.2" />
            <circle cx={cx} cy={cy - 4} r="1.8" fill="rgba(251,191,36,0.45)" />
          </g>
          <text x={cx} y={cy + 5}  textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="monospace">
            {currentStep + 1}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.38)" fontSize="8" fontFamily="monospace">
            / 8
          </text>
        </>
      )}

      {/* Fixed camera icon at south (0° / bottom) — rotate mode */}
      {!allCaptured && !isOrbitMode && (
        <g transform={`translate(${cx}, ${cy + ro + 11})`} opacity="0.75">
          <rect x="-8" y="-5.5" width="16" height="11" rx="2.5"
            fill="rgba(251,191,36,0.18)" stroke="rgba(251,191,36,0.85)" strokeWidth="1.3" />
          <circle cx="0" cy="0" r="2.5" fill="none" stroke="rgba(251,191,36,0.70)" strokeWidth="1.1" />
        </g>
      )}

      {/* Camera marker moves to active orbital position — orbit mode */}
      {!allCaptured && isOrbitMode && (() => {
        const [mx, my] = midPt(currentStep, (ro + ri) / 2)
        return (
          <g transform={`translate(${mx}, ${my})`} opacity="0.88">
            <rect x="-4.5" y="-7" width="9" height="14" rx="2"
              fill="rgba(0,0,0,0.35)" stroke="rgba(251,191,36,0.95)" strokeWidth="1.1" />
            <circle cx="0" cy="-3" r="1.3" fill="rgba(251,191,36,0.80)" />
          </g>
        )
      })()}
    </svg>
  )
}

// ── Cross-section arc HUD for relief180 (side-view tilt guide) ───────────────
function ReliefCrossSectionHUD({ currentStep, capturedFrames }: {
  currentStep: number
  capturedFrames: (Blob | null)[]
}) {
  const cx = 100, cy = 78, r = 52
  const allCaptured = currentStep >= 6

  const NODES = [
    { step: 1, nodeAngle: 0,   label: 'XL' },
    { step: 2, nodeAngle: 45,  label: 'LC' },
    { step: 3, nodeAngle: 90,  label: 'TD' },
    { step: 4, nodeAngle: 135, label: 'RC' },
    { step: 5, nodeAngle: 180, label: 'XR' },
  ] as const

  const nPos = (na: number) => {
    const rad = (180 - na) * Math.PI / 180
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
  }

  return (
    <svg viewBox="0 0 200 96" className="w-52 h-16" aria-hidden="true">
      {/* Ground surface */}
      <line x1="14" y1={cy} x2="186" y2={cy}
        stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round" />
      {[28, 46, 64, 82, 100, 118, 136, 154, 172].map(x => (
        <line key={x} x1={x} y1={cy} x2={x - 4} y2={cy + 6}
          stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
      ))}
      {/* Dashed arc */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(251,146,60,0.55)" strokeWidth="1.2" strokeDasharray="4 3" />
      {/* Overhead guide */}
      <line x1={cx} y1={cy - r - 4} x2={cx} y2={cy}
        stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" strokeDasharray="2 2" />

      {NODES.map(({ step, nodeAngle, label }) => {
        const { x, y } = nPos(nodeAngle)
        const captured = capturedFrames[step] !== null
        const active   = step === currentStep && !allCaptured
        const atGround = nodeAngle === 0 || nodeAngle === 180
        const labelY   = atGround ? cy + 13 : y - 8
        const phoneRot = (nodeAngle - 90) * (2 / 3)
        return (
          <g key={step}>
            {active && (
              <circle cx={x} cy={y} r="6" fill="none" stroke="rgba(251,146,60,0.40)" strokeWidth="1">
                <animate attributeName="r" values="6;14" dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.55;0" dur="1.4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={x} cy={y}
              r={active ? 6 : captured ? 5 : 3.5}
              fill={active ? 'rgba(251,146,60,0.95)' : captured ? 'rgba(251,146,60,0.58)' : 'rgba(255,255,255,0.50)'} />
            {captured && (
              <path d={`M ${x - 3} ${y} L ${x - 1} ${y + 2.5} L ${x + 3.5} ${y - 3}`}
                fill="none" stroke="rgba(251,146,60,0.95)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            )}
            {active && (
              <g transform={`translate(${x}, ${y}) rotate(${phoneRot})`} opacity="0.90">
                <rect x="-9" y="-2.5" width="18" height="5" rx="1.5"
                  fill="rgba(251,146,60,0.18)" stroke="rgba(251,146,60,0.90)" strokeWidth="1.2" />
                <circle cx="7" cy="0" r="1.4" fill="rgba(251,146,60,0.75)" />
              </g>
            )}
            <text x={x} y={labelY} textAnchor="middle"
              fill={active ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.60)'}
              fontSize="7" fontFamily="monospace" fontWeight={active ? 'bold' : 'normal'}>
              {label}
            </text>
          </g>
        )
      })}

      {/* BASE step: pulsing flat-camera icon at apex */}
      {currentStep === 0 && !allCaptured && (
        <g transform={`translate(${cx}, ${cy - r})`} opacity="0.82">
          <rect x="-7" y="-5" width="14" height="10" rx="2"
            fill="rgba(251,146,60,0.18)" stroke="rgba(251,146,60,0.88)" strokeWidth="1.2">
            <animate attributeName="opacity" values="0.82;0.30;0.82" dur="1.6s" repeatCount="indefinite" />
          </rect>
          <circle cx="0" cy="0" r="2.2" fill="rgba(251,146,60,0.70)" />
        </g>
      )}
    </svg>
  )
}

// ── Interactive crop overlay for artwork2d / document ─────────────────────────
type CropCorners = {
  tl: { x: number; y: number }
  tr: { x: number; y: number }
  bl: { x: number; y: number }
  br: { x: number; y: number }
}

function CropOverlay({ corners, onCornersChange, accentColor }: {
  corners: CropCorners
  onCornersChange: (c: CropCorners) => void
  accentColor: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<keyof CropCorners | null>(null)

  const minX = Math.min(corners.tl.x, corners.bl.x)
  const maxX = Math.max(corners.tr.x, corners.br.x)
  const minY = Math.min(corners.tl.y, corners.tr.y)
  const maxY = Math.max(corners.bl.y, corners.br.y)

  const onPD = (key: keyof CropCorners) => (e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = key
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPM = (e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return
    const r = containerRef.current.getBoundingClientRect()
    const x = Math.max(2, Math.min(98, ((e.clientX - r.left)  / r.width)  * 100))
    const y = Math.max(2, Math.min(98, ((e.clientY - r.top)   / r.height) * 100))
    onCornersChange({ ...corners, [dragging.current]: { x, y } })
  }
  const onPU = () => { dragging.current = null }

  const HANDLES = [
    ['tl', corners.tl], ['tr', corners.tr],
    ['bl', corners.bl], ['br', corners.br],
  ] as [keyof CropCorners, { x: number; y: number }][]

  return (
    <div ref={containerRef} className="absolute inset-0 touch-none"
      onPointerMove={onPM} onPointerUp={onPU}>
      {/* Dark mask with crop window punched out */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="ch-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={`${minX}%`} y={`${minY}%`}
              width={`${maxX - minX}%`} height={`${maxY - minY}%`} fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#ch-mask)" />
        {/* Crop border */}
        <rect x={`${minX}%`} y={`${minY}%`} width={`${maxX - minX}%`} height={`${maxY - minY}%`}
          fill="none" stroke={accentColor} strokeWidth="1.5" />
        {/* Rule-of-thirds grid */}
        {[33.3, 66.6].map(p => (
          <g key={p}>
            <line
              x1={`${minX + (maxX - minX) * p / 100}%`} y1={`${minY}%`}
              x2={`${minX + (maxX - minX) * p / 100}%`} y2={`${maxY}%`}
              stroke={accentColor} strokeWidth="0.5" strokeOpacity="0.30" />
            <line
              x1={`${minX}%`} y1={`${minY + (maxY - minY) * p / 100}%`}
              x2={`${maxX}%`} y2={`${minY + (maxY - minY) * p / 100}%`}
              stroke={accentColor} strokeWidth="0.5" strokeOpacity="0.30" />
          </g>
        ))}
      </svg>
      {/* Touch-friendly corner handles */}
      {HANDLES.map(([key, pos]) => (
        <div key={key} onPointerDown={onPD(key)}
          className="absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
          <div className="w-5 h-5 rounded-full border-2 bg-black/70 shadow-lg"
            style={{ borderColor: accentColor }} />
        </div>
      ))}
      {/* Instruction hint */}
      <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
        <span className="text-[11px] text-white/75 bg-black/55 px-3 py-1 rounded-full backdrop-blur-sm">
          Drag corners to match the exact edges of your memory
        </span>
      </div>
    </div>
  )
}

const triggerHaptic = (duration: number) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(duration)
}

// ── SVG progress ring for multi-shot shutter buttons (scan3d / relief180) ────────────────
const RING_CIRCUMFERENCE = 289 // 2 * PI * r(46), rounded

function ShutterProgressRing({ progress }: { progress: number }) {
  const offset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * progress) / 100
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90 origin-center pointer-events-none" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" className="text-white/20" strokeWidth="4" />
      <circle
        cx="50" cy="50" r="46" fill="transparent" stroke="currentColor"
        className="text-yellow-400 transition-all duration-300 ease-out"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="289"
        strokeDashoffset={offset}
      />
    </svg>
  )
}

// ── 2D trackpad for guide-box width/height, replacing the old dual-slider control ────────
const BOX_DIM_MIN = 25
const BOX_DIM_MAX = 95

function BoxTrackpad({ width, height, onChange, disabled }: {
  width: number
  height: number
  onChange: (w: number, h: number) => void
  disabled?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const updateFromPoint = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const xPct = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    const yPct = Math.max(0, Math.min(1, (clientY - r.top) / r.height))
    const range = BOX_DIM_MAX - BOX_DIM_MIN
    const w = BOX_DIM_MIN + xPct * range
    const h = BOX_DIM_MAX - yPct * range // screen top = max height, screen bottom = min height
    onChange(Math.round(w), Math.round(h))
  }, [onChange])

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    draggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromPoint(e.clientX, e.clientY)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled || !draggingRef.current) return
    updateFromPoint(e.clientX, e.clientY)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* already released */ }
  }

  const range = BOX_DIM_MAX - BOX_DIM_MIN
  const puckLeftPct = ((width - BOX_DIM_MIN) / range) * 100
  const puckBottomPct = ((height - BOX_DIM_MIN) / range) * 100

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`relative w-20 h-20 rounded-xl bg-white/10 border border-white/30 touch-none ${
        disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'
      }`}
      aria-label="Guide box size — drag to adjust width and height"
    >
      <div
        className="w-6 h-6 rounded-full bg-white shadow-lg absolute -translate-x-1/2 translate-y-1/2 pointer-events-none"
        style={{ left: `${puckLeftPct}%`, bottom: `${puckBottomPct}%` }}
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  mode: CaptureMode
  onModeChange: (mode: CaptureMode) => void
  onCapture: (media: CapturedMedia) => void
  onClose: () => void
}

export default function CaptureScreen({ mode, onModeChange, onCapture, onClose }: Props) {
  // ── Camera state ──────────────────────────────────────────────────────────
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('requesting')
  const [isCapturing, setIsCapturing] = useState(false)
  const [isRecording] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Physical device rotation, mirrored onto UI content via CSS transform (layout itself stays portrait-locked)
  const [uiRotation, setUiRotation] = useState<0 | 90 | -90 | 180>(0)

  // ── Hardware zoom state ───────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1)
  const [zoomLimits, setZoomLimits] = useState<ZoomLimits | null>(null)
  const [supportsZoom, setSupportsZoom] = useState(false)

  // ── Shutter flash state ───────────────────────────────────────────────────
  const [flashOpacity, setFlashOpacity] = useState(0)

  // ── Tap-to-focus reticle state (visual-only — no MediaStreamTrack focus constraints) ──
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null)

  // ── Capture delay timer state ─────────────────────────────────────────────
  const [timerOn, setTimerOn] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  // ── Document multi-page state ─────────────────────────────────────────────
  const [docPages, setDocPages] = useState<Blob[]>([])
  const [docOverlay, setDocOverlay] = useState(false)

  // ── Crop state (artwork2d + document) ────────────────────────────────────
  type CropState = { blob: Blob; objectUrl: string }
  const [cropState, setCropState] = useState<CropState | null>(null)
  const [cropCorners, setCropCorners] = useState<CropCorners>({
    tl: { x: 8, y: 8 }, tr: { x: 92, y: 8 },
    bl: { x: 8, y: 92 }, br: { x: 92, y: 92 },
  })

  // ── scan3d 8-frame state ──────────────────────────────────────────────────
  const [capturedFrames, setCapturedFrames] = useState<(Blob | null)[]>(() => Array(8).fill(null))
  const [currentStep, setCurrentStep] = useState(0)
  const [isOrbitMode, setIsOrbitMode] = useState(false)
  const [guideBoxWidth, setGuideBoxWidth] = useState(65)
  const [guideBoxHeight, setGuideBoxHeight] = useState(75)
  const [ghostUrl, setGhostUrl] = useState<string | null>(null)
  const [videoAR, setVideoAR] = useState<number | null>(null)
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null)

  // ── relief180 6-frame state ───────────────────────────────────────────────
  const [reliefFrames, setReliefFrames] = useState<(Blob | null)[]>(() => Array(6).fill(null))
  const [reliefStep, setReliefStep] = useState(0)
  const [lightingMode, setLightingMode] = useState<'natural' | 'torch'>('natural')
  const [torchUnsupported, setTorchUnsupported] = useState(false)
  const [baseSilhouetteUrl, setBaseSilhouetteUrl] = useState<string | null>(null)

  // ── Level indicator for 2D mode ───────────────────────────────────────────
  const [levelBeta, setLevelBeta] = useState(30)
  const [levelGamma, setLevelGamma] = useState(20)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const videoFeedRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<number | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const capturedFramesRef = useRef<(Blob | null)[]>(Array(8).fill(null))
  const ghostUrlRef = useRef<string | null>(null)
  const reliefFramesRef = useRef<(Blob | null)[]>(Array(6).fill(null))
  const orientationTrackingRef = useRef(false)
  const pinchStartDistRef = useRef<number | null>(null)
  const pinchStartZoomRef = useRef(1)
  const prevIsLevelRef = useRef(false)
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Callback ref: attaches the stream the instant the <video> element mounts (or remounts)
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
    if (el && streamRef.current) {
      el.srcObject = streamRef.current
    }
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────
  const is2D       = mode === 'artwork2d'
  const isDocument = mode === 'document'
  const isRelief   = mode === 'relief180'
  const isScan3d   = mode === 'scan3d'
  const isFlat     = is2D || isDocument
  const cameraReady = cameraStatus === 'active'

  const allFramesCaptured  = isScan3d  && currentStep >= 8
  const allReliefCaptured  = isRelief  && reliefStep  >= 6

  // Bubble level axis swap: levelBeta/levelGamma are always the phone's raw, unfrozen front-back /
  // left-right tilt — independent of uiRotation's flat-lock. When the UI is visually rotated 90°,
  // "pitch" and "roll" trade places on screen, so the tilt vector is rotated by the same snapped
  // angle to keep the bubble moving the direction the user actually tilts.
  const { effBeta, effGamma } = (() => {
    switch (uiRotation) {
      case 90:   return { effBeta: -levelGamma, effGamma: levelBeta }
      case -90:  return { effBeta: levelGamma,  effGamma: -levelBeta }
      case 180:  return { effBeta: -levelBeta,  effGamma: -levelGamma }
      default:   return { effBeta: levelBeta,   effGamma: levelGamma }
    }
  })()
  const isLevel = (is2D || isDocument) && Math.abs(effBeta) < 8 && Math.abs(effGamma) < 8
  const bubbleX = Math.max(-11, Math.min(11, (effGamma / 30) * 11))
  const bubbleY = Math.max(-11, Math.min(11, (effBeta  / 30) * 11))

  // ── Camera init ───────────────────────────────────────────────────────────
  const initCamera = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable')
      return
    }
    setCameraStatus('requesting')
    navigator.mediaDevices
      .getUserMedia({ video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        aspectRatio: { ideal: window.innerHeight > window.innerWidth ? 3 / 4 : 4 / 3 },
      }, audio: false })
      .then(s => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = s
        if (videoRef.current) videoRef.current.srcObject = s
        setCameraStatus('active')

        // Hardware zoom feature detection — iOS Safari has no `zoom` capability, so this
        // stays false there and the zoom UI simply never renders (graceful degradation).
        const track = s.getVideoTracks()[0]
        const caps = track?.getCapabilities?.() as ZoomCapabilities | undefined
        if (caps?.zoom) {
          const { min, max, step } = caps.zoom
          setZoomLimits({ min, max, step: step || 0.1 })
          setSupportsZoom(true)
          const settings = track.getSettings() as ZoomSettings
          setZoom(settings.zoom ?? min)
        } else {
          setSupportsZoom(false)
          setZoomLimits(null)
          setZoom(1)
        }
      })
      .catch(err => {
        const status: CameraStatus =
          err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' ? 'denied' :
          err.name === 'NotFoundError'   || err.name === 'DevicesNotFoundError'  ? 'unavailable' :
          'error'
        setCameraStatus(status)
      })
  }, [])

  useEffect(() => {
    initCamera()
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      clearInterval(recordingTimerRef.current)
      if (ghostUrlRef.current) URL.revokeObjectURL(ghostUrlRef.current)
    }
  }, [initCamera])

  // Bounds newZoom to the hardware's supported range, then applies it via applyConstraints
  // on the already-active track — never re-triggers getUserMedia.
  const handleZoomChange = useCallback((newZoom: number) => {
    if (!supportsZoom || !zoomLimits) return
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const bounded = Math.max(zoomLimits.min, Math.min(zoomLimits.max, newZoom))
    setZoom(bounded)
    track.applyConstraints({ advanced: [{ zoom: bounded }] } as unknown as MediaTrackConstraints).catch(() => {})
  }, [supportsZoom, zoomLimits])

  // Pinch-to-zoom: tracks the initial two-finger distance, then scales zoom by the
  // ratio of current distance to that baseline. No-ops entirely on unsupported hardware.
  const handlePinchStart = useCallback((e: React.TouchEvent) => {
    if (!supportsZoom || cropState || (isFlat && docOverlay) || e.touches.length !== 2) return
    const [t1, t2] = [e.touches[0], e.touches[1]]
    pinchStartDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
    pinchStartZoomRef.current = zoom
  }, [supportsZoom, cropState, isFlat, docOverlay, zoom])

  const handlePinchMove = useCallback((e: React.TouchEvent) => {
    if (!supportsZoom || pinchStartDistRef.current == null || e.touches.length !== 2) return
    const [t1, t2] = [e.touches[0], e.touches[1]]
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
    const scale = dist / pinchStartDistRef.current
    handleZoomChange(pinchStartZoomRef.current * scale)
  }, [supportsZoom, handleZoomChange])

  const handlePinchEnd = useCallback(() => {
    pinchStartDistRef.current = null
  }, [])

  // Tap-to-focus reticle — purely visual, no MediaStreamTrack focus constraints (iOS Safari
  // has no manual-focus API, so this stays a UX-only affordance on every platform). Coordinates
  // are measured against videoFeedRef (the videoContentStyle-sized box) rather than the outer
  // cropContainerRef, so the reticle lands on the actual image and not the letterbox bars.
  const handleFocusTap = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary || cropState || (isFlat && docOverlay) || !videoFeedRef.current) return
    const r = videoFeedRef.current.getBoundingClientRect()
    setFocusPoint({ x: e.clientX - r.left, y: e.clientY - r.top })
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current)
    focusTimeoutRef.current = setTimeout(() => setFocusPoint(null), 2000)
  }, [cropState, isFlat, docOverlay])

  useEffect(() => {
    return () => { if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current) }
  }, [])

  // Capture the video's native aspect ratio so the guide box overlay can be
  // constrained to the actual video content area (not the full container width).
  useEffect(() => {
    if (cameraStatus !== 'active') return
    const video = videoRef.current
    if (!video) return
    const readAR = () => {
      if (video.videoWidth && video.videoHeight) {
        setVideoAR(video.videoWidth / video.videoHeight)
      }
    }
    video.addEventListener('loadedmetadata', readAR)
    readAR()
    return () => video.removeEventListener('loadedmetadata', readAR)
  }, [cameraStatus])

  // Track the viewfinder container size so pixel-exact video content bounds can be computed.
  useEffect(() => {
    const el = cropContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setContainerSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keep isFullscreen synced with the browser's actual fullscreen state (system gestures, ESC, etc.)
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement != null)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Native-rotation illusion: mirror physical device orientation onto UI content via CSS transform,
  // while the outer layout stays rigidly portrait-locked. Snapped to 90° increments.
  const enableOrientationTracking = useCallback(() => {
    if (orientationTrackingRef.current || typeof window === 'undefined') return
    orientationTrackingRef.current = true
    const handler = (e: DeviceOrientationEvent) => {
      const beta = e.beta
      const gamma = e.gamma
      if (beta === null || gamma === null) return

      // Renamed to avoid collision with the flat-mode flag.
      // Expanded deadzone to 55 degrees to beat the 45-degree orientation snap.
      const isDeviceFlat = (Math.abs(beta) < 55 || Math.abs(beta) > 125) && Math.abs(gamma) < 55
      if (isDeviceFlat) return

      let angle: 0 | 90 | -90 | 180 = 0
      if (Math.abs(gamma) > 45) {
        angle = gamma > 0 ? -90 : 90
      } else if (Math.abs(beta) > 135) {
        angle = 180
      }
      setUiRotation(prev => (prev === angle ? prev : angle))
    }
    window.addEventListener('deviceorientation', handler)
  }, [])

  // Android / other browsers: no explicit permission gate needed, so start tracking immediately.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
    if (typeof DOE.requestPermission !== 'function') {
      enableOrientationTracking()
    }
  }, [enableOrientationTracking])

  const toggleFullscreen = useCallback(() => {
    // iOS 13+ requires the accelerometer permission prompt to originate from a direct user
    // interaction — piggyback the request on this existing tap rather than a synthetic one.
    if (typeof window !== 'undefined' && !orientationTrackingRef.current) {
      const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
      if (typeof DOE.requestPermission === 'function') {
        DOE.requestPermission()
          .then(perm => { if (perm === 'granted') enableOrientationTracking() })
          .catch(() => {})
      }
    }
    if (document.fullscreenElement) {
      document.exitFullscreen()
        .then(() => {
          try { screen.orientation?.unlock?.() } catch { /* unsupported */ }
        })
        .catch(() => {})
    } else {
      document.documentElement.requestFullscreen()
        .then(() => {
          try {
            const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
            orientation.lock?.('portrait-primary')?.catch(() => {})
          } catch { /* unsupported */ }
        })
        .catch(() => {})
    }
  }, [enableOrientationTracking])

  // Fail-safe: if the capture screen unmounts (user backs out, navigates away) while still
  // fullscreen, force-exit and release the orientation lock instead of leaving the browser stuck.
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      try { screen.orientation?.unlock?.() } catch { /* unsupported */ }
    }
  }, [])

  // Reset all transient state when mode changes
  useEffect(() => {
    if (isRecording) {
      clearInterval(recordingTimerRef.current)
      mediaRecorderRef.current?.stop()
    }
    setDocPages([])
    setDocOverlay(false)

    // Cancel any in-flight capture-timer countdown — its interval closes over the
    // previous mode's handleShutter, so it must not fire into a now-hidden mode.
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
    setCountdown(null)

    // Reset scan3d
    const freshFrames = Array(8).fill(null) as (Blob | null)[]
    capturedFramesRef.current = freshFrames
    setCapturedFrames(freshFrames)
    setCurrentStep(0)
    setIsOrbitMode(false)
    setGuideBoxWidth(65)
    setGuideBoxHeight(75)
    if (ghostUrlRef.current) { URL.revokeObjectURL(ghostUrlRef.current); ghostUrlRef.current = null }
    setGhostUrl(null)

    // Reset relief + disable torch (any lingering torch from the previous mode)
    const freshRelief = Array(6).fill(null) as (Blob | null)[]
    reliefFramesRef.current = freshRelief
    setReliefFrames(freshRelief)
    setReliefStep(0)
    setLightingMode('natural')
    setTorchUnsupported(false)
    // Always attempt torch-off on mode switch (safe no-op if not supported)
    const track = streamRef.current?.getVideoTracks()[0]
    if (track) {
      track.applyConstraints({ advanced: [{ torch: false } as unknown as MediaTrackConstraintSet] }).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Re-attach stream on mode change in case the video element was remounted
  useEffect(() => {
    const el = videoRef.current
    if (el && streamRef.current && !el.srcObject) {
      el.srcObject = streamRef.current
    }
  }, [mode])

  // Update scan3d ghost (onion-skin) when step advances
  useEffect(() => {
    if (!isScan3d || currentStep === 0) {
      if (ghostUrlRef.current) { URL.revokeObjectURL(ghostUrlRef.current); ghostUrlRef.current = null }
      setGhostUrl(null)
      return
    }
    const prevBlob = capturedFramesRef.current[currentStep - 1]
    if (!prevBlob) return
    if (ghostUrlRef.current) URL.revokeObjectURL(ghostUrlRef.current)
    const url = URL.createObjectURL(prevBlob)
    ghostUrlRef.current = url
    setGhostUrl(url)
  }, [isScan3d, currentStep])

  // Apply / remove hardware torch when lighting mode changes (relief only)
  useEffect(() => {
    if (!isRelief || !cameraReady) return
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const enable = lightingMode === 'torch'
    track
      .applyConstraints({ advanced: [{ torch: enable } as unknown as MediaTrackConstraintSet] })
      .catch(() => {
        if (enable) setTorchUnsupported(true)
      })
  }, [lightingMode, isRelief, cameraReady])

  // Device orientation for 2D level indicator
  useEffect(() => {
    if (!is2D && !isDocument) { setLevelBeta(30); setLevelGamma(20); return }
    let cleanup: (() => void) | undefined
    const handler = (e: DeviceOrientationEvent) => {
      setLevelBeta(e.beta  ?? 30)
      setLevelGamma(e.gamma ?? 20)
    }
    if (typeof window !== 'undefined') {
      const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
      if (typeof DOE.requestPermission === 'function') {
        DOE.requestPermission()
          .then(perm => {
            if (perm === 'granted') {
              window.addEventListener('deviceorientation', handler)
              cleanup = () => window.removeEventListener('deviceorientation', handler)
            } else {
              const t = setTimeout(() => { setLevelBeta(1.5); setLevelGamma(0.8) }, 1500)
              cleanup = () => clearTimeout(t)
            }
          })
          .catch(() => {
            const t = setTimeout(() => { setLevelBeta(1.5); setLevelGamma(0.8) }, 1500)
            cleanup = () => clearTimeout(t)
          })
      } else if ('ondeviceorientation' in window) {
        window.addEventListener('deviceorientation', handler)
        cleanup = () => window.removeEventListener('deviceorientation', handler)
      } else {
        const t = setTimeout(() => { setLevelBeta(1.5); setLevelGamma(0.8) }, 2000)
        cleanup = () => clearTimeout(t)
      }
    }
    return () => cleanup?.()
  }, [is2D])

  // Micro-vibration "snap" the instant the bubble crosses into level — fires only on the
  // false→true transition (tracked via prevIsLevelRef), never while it remains level and
  // never when it un-levels, so it reads as a tactile detent rather than a buzz.
  useEffect(() => {
    if (isLevel && !prevIsLevelRef.current) {
      triggerHaptic(20)
    }
    prevIsLevelRef.current = isLevel
  }, [isLevel])

  // Create/revoke object URL for BASE silhouette overlay (relief steps 1–5)
  useEffect(() => {
    if (!isRelief || reliefStep < 1) { setBaseSilhouetteUrl(null); return }
    const blob = reliefFrames[0]
    if (!blob) { setBaseSilhouetteUrl(null); return }
    const url = URL.createObjectURL(blob)
    setBaseSilhouetteUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [isRelief, reliefStep, reliefFrames])

  // Snapshots the live video into a canvas, rotating the pixel data so the saved frame matches
  // the user's visual horizon (uiRotation) rather than the phone's physical/portrait-locked sensor feed.
  const drawRotatedFrame = useCallback((video: HTMLVideoElement): HTMLCanvasElement => {
    const vw = video.videoWidth  || 1280
    const vh = video.videoHeight || 720
    const swapped = uiRotation === 90 || uiRotation === -90
    const canvas = document.createElement('canvas')
    canvas.width  = swapped ? vh : vw
    canvas.height = swapped ? vw : vh
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.translate(canvas.width / 2, canvas.height / 2)
      // Inverted: a counter-clockwise physical turn (uiRotation > 0) must spin the pixel
      // data clockwise to land right-side-up, so the canvas rotates opposite to uiRotation.
      ctx.rotate((-uiRotation * Math.PI) / 180)
      ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
    }
    return canvas
  }, [uiRotation])

  // Visual flash + haptic tick fired at the moment of capture, shared across all 4 modes.
  const playShutterEffect = useCallback(() => {
    triggerHaptic(35)
    setFlashOpacity(1)
    // Hold at full white for 50ms before fading, so the browser has a guaranteed
    // paint of the opaque flash before the opacity transition kicks in — setting
    // 1 then 0 back-to-back can otherwise get batched into a single React commit.
    setTimeout(() => setFlashOpacity(0), 50)
  }, [])

  // ── Flat-page capture (artwork2d + document) → enters crop state ─────────
  const captureDocPage = useCallback(() => {
    if (isCapturing || docOverlay || cropState) return
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    playShutterEffect()
    setIsCapturing(true)
    const canvas = drawRotatedFrame(video)
    canvas.toBlob(blob => {
      if (!blob) { setIsCapturing(false); return }
      const objectUrl = URL.createObjectURL(blob)
      // Default crop box, inset 8% within the image's *actual rendered (object-contain) bounds*
      // rather than a fixed 8–92% of the whole container. A rotated (landscape) capture is heavily
      // letterboxed inside the still-portrait crop container, so a fixed container-relative box
      // would span mostly black bars instead of image content, producing a degenerate crop.
      if (containerSize) {
        const iAsp = canvas.width / canvas.height
        const cAsp = containerSize.w / containerSize.h
        const renderWPct = iAsp > cAsp ? 100 : (containerSize.h * iAsp) / containerSize.w * 100
        const renderHPct = iAsp > cAsp ? (containerSize.w / iAsp) / containerSize.h * 100 : 100
        const offXPct = (100 - renderWPct) / 2
        const offYPct = (100 - renderHPct) / 2
        const insetX = renderWPct * 0.08
        const insetY = renderHPct * 0.08
        setCropCorners({
          tl: { x: offXPct + insetX,              y: offYPct + insetY },
          tr: { x: offXPct + renderWPct - insetX, y: offYPct + insetY },
          bl: { x: offXPct + insetX,              y: offYPct + renderHPct - insetY },
          br: { x: offXPct + renderWPct - insetX, y: offYPct + renderHPct - insetY },
        })
      } else {
        setCropCorners({ tl: { x: 8, y: 8 }, tr: { x: 92, y: 8 }, bl: { x: 8, y: 92 }, br: { x: 92, y: 92 } })
      }
      setCropState({ blob, objectUrl })
      setIsCapturing(false)
    }, 'image/jpeg', 0.92)
  }, [isCapturing, docOverlay, cropState, drawRotatedFrame, containerSize, playShutterEffect])

  const finishDocument = useCallback(() => {
    const allPages = docPages
    if (!allPages.length) return
    const primaryBlob = allPages[0]
    // Local preview only — no network round-trip. The real upload (to capsule-assets)
    // happens later in CaptureFlow once the user confirms naming/metadata.
    const url = URL.createObjectURL(primaryBlob)
    setDocPages([])
    setDocOverlay(false)
    onCapture({ blob: primaryBlob, url, mediaType: 'image', pages: allPages })
  }, [docPages, onCapture])

  const dismissDocOverlay = useCallback(() => {
    setDocOverlay(false)
  }, [])

  // ── scan3d: capture one still frame ──────────────────────────────────────
  const captureFrame3D = useCallback(() => {
    if (isCapturing || currentStep >= 8) return
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    playShutterEffect()
    setIsCapturing(true)
    const canvas = drawRotatedFrame(video)
    canvas.toBlob(blob => {
      if (!blob) { setIsCapturing(false); return }
      const step = currentStep
      setCapturedFrames(prev => {
        const next = [...prev]
        next[step] = blob
        capturedFramesRef.current = next
        return next
      })
      setCurrentStep(step + 1)
      setIsCapturing(false)
    }, 'image/jpeg', 0.92)
  }, [isCapturing, currentStep, drawRotatedFrame, playShutterEffect])

  const compileScan3D = useCallback(() => {
    const frames = capturedFramesRef.current.filter((b): b is Blob => b !== null)
    if (frames.length < 8) return
    const primaryBlob = frames[0]
    // Local preview only — no network round-trip. The real upload (to capsule-assets)
    // happens later in CaptureFlow once the user confirms naming/metadata.
    const url = URL.createObjectURL(primaryBlob)
    onCapture({ blob: primaryBlob, url, mediaType: 'image', frames })
  }, [onCapture])

  const handleOrbitToggle = useCallback((orbit: boolean) => {
    if (orbit === isOrbitMode) return
    if (currentStep > 1) {
      const freshFrames = Array(8).fill(null) as (Blob | null)[]
      capturedFramesRef.current = freshFrames
      setCapturedFrames(freshFrames)
      setCurrentStep(0)
      if (ghostUrlRef.current) { URL.revokeObjectURL(ghostUrlRef.current); ghostUrlRef.current = null }
      setGhostUrl(null)
    }
    setGuideBoxWidth(65)
    setGuideBoxHeight(75)
    setIsOrbitMode(orbit)
  }, [isOrbitMode, currentStep])

  // ── relief180: capture one still frame ───────────────────────────────────
  const captureReliefFrame = useCallback(() => {
    if (isCapturing || reliefStep >= 6) return
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    playShutterEffect()
    setIsCapturing(true)
    const canvas = drawRotatedFrame(video)
    canvas.toBlob(blob => {
      if (!blob) { setIsCapturing(false); return }
      const step = reliefStep
      setReliefFrames(prev => {
        const next = [...prev]
        next[step] = blob
        reliefFramesRef.current = next
        return next
      })
      setReliefStep(step + 1)
      setIsCapturing(false)
    }, 'image/jpeg', 0.92)
  }, [isCapturing, reliefStep, drawRotatedFrame, playShutterEffect])

  const compileRelief = useCallback(() => {
    const frames = reliefFramesRef.current.filter((b): b is Blob => b !== null)
    if (frames.length < 6) return
    const track = streamRef.current?.getVideoTracks()[0]
    if (track) {
      track.applyConstraints({ advanced: [{ torch: false } as unknown as MediaTrackConstraintSet] }).catch(() => {})
    }
    const primaryBlob = frames[3]  // center (Top-Down) frame as primary thumbnail (index 3 of 6)
    // Local preview only — no network round-trip. The real upload (to capsule-assets)
    // happens later in CaptureFlow once the user confirms naming/metadata.
    const url = URL.createObjectURL(primaryBlob)
    onCapture({ blob: primaryBlob, url, mediaType: 'image', reliefFrames: frames })
  }, [onCapture])

  // ── Crop confirmation ─────────────────────────────────────────────────────
  const confirmCrop = useCallback(() => {
    if (!cropState || !cropContainerRef.current) return
    const container = cropContainerRef.current
    const containerW = container.clientWidth
    const containerH = container.clientHeight
    const { objectUrl } = cropState

    const img = new Image()
    img.onload = () => {
      const imgW = img.naturalWidth
      const imgH = img.naturalHeight
      const cAsp = containerW / containerH
      const iAsp = imgW / imgH
      let renderW: number, renderH: number, offX: number, offY: number
      if (iAsp > cAsp) {
        renderW = containerW; renderH = containerW / iAsp
        offX = 0;            offY = (containerH - renderH) / 2
      } else {
        renderH = containerH; renderW = containerH * iAsp
        offX = (containerW - renderW) / 2; offY = 0
      }

      const minXpx = Math.min(cropCorners.tl.x, cropCorners.bl.x) / 100 * containerW
      const maxXpx = Math.max(cropCorners.tr.x, cropCorners.br.x) / 100 * containerW
      const minYpx = Math.min(cropCorners.tl.y, cropCorners.tr.y) / 100 * containerH
      const maxYpx = Math.max(cropCorners.bl.y, cropCorners.br.y) / 100 * containerH

      const sx = imgW / renderW, sy = imgH / renderH
      const cx = Math.max(0, (minXpx - offX) * sx)
      const cy = Math.max(0, (minYpx - offY) * sy)
      const cw = Math.min(imgW - cx, (maxXpx - minXpx) * sx)
      const ch = Math.min(imgH - cy, (maxYpx - minYpx) * sy)

      const out = document.createElement('canvas')
      out.width = Math.round(cw); out.height = Math.round(ch)
      out.getContext('2d')?.drawImage(img,
        Math.round(cx), Math.round(cy), Math.round(cw), Math.round(ch),
        0, 0, Math.round(cw), Math.round(ch))

      out.toBlob(croppedBlob => {
        if (!croppedBlob) return
        URL.revokeObjectURL(objectUrl)
        setCropState(null)
        setDocPages(prev => [...prev, croppedBlob])
        setDocOverlay(true)
      }, 'image/jpeg', 0.92)
    }
    img.src = objectUrl
  }, [cropState, cropCorners])

  const cancelCrop = useCallback(() => {
    if (!cropState) return
    URL.revokeObjectURL(cropState.objectUrl)
    setCropState(null)
  }, [cropState])

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const mediaType: CapturedMedia['mediaType'] = file.type.startsWith('video/') ? 'video' : 'image'
    onCapture({ blob: file, url, mediaType })
    e.target.value = ''
  }, [onCapture])

  // ── Shutter ───────────────────────────────────────────────────────────────
  const handleShutter = useCallback(() => {
    if (cropState) return
    if (isScan3d)      captureFrame3D()
    else if (isRelief) captureReliefFrame()
    else if (isFlat)   { if (!docOverlay && !isCapturing) captureDocPage() }
  }, [cropState, isScan3d, captureFrame3D, isRelief, captureReliefFrame, isFlat, docOverlay, isCapturing, captureDocPage])

  // Shutter entry point bound to the actual buttons — decides whether to capture immediately
  // (timer off) or kick off a 3-2-1 countdown first (timer on), then delegates to the
  // existing handleShutter/capture functions unchanged, so the flash + final haptic they
  // already trigger fire exactly the same way whether the timer was used or not.
  const handleShutterClick = useCallback(() => {
    if (!timerOn) { handleShutter(); return }
    if (countdown !== null) return // ignore taps while a countdown is already running
    triggerHaptic(30)
    setCountdown(3)
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        const next = (prev ?? 1) - 1
        if (next <= 0) {
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
          handleShutter()
          return null
        }
        triggerHaptic(30)
        return next
      })
    }, 1000)
  }, [timerOn, countdown, handleShutter])

  // Fail-safe: clear any in-flight countdown interval on unmount so it can't keep firing
  // (and eventually call handleShutter) after the user has navigated away.
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [])

  // ── UI text ───────────────────────────────────────────────────────────────
  const tipText = docOverlay
    ? ''
    : isFlat && docPages.length > 0
    ? `Page ${docPages.length} saved — tap shutter to add another`
    : isCapturing
    ? is2D ? 'Hold steady — capturing every brushstroke and texture' : 'Hold steady — scanning'
    : is2D       ? 'Lay artwork flat · Level indicator turns green when steady'
    : isDocument ? 'Place each page flat within the frame, then press shutter'
    :               ''

  const accentBtn = is2D
    ? { idle: 'bg-violet-400 hover:bg-violet-300', active: 'bg-violet-500' }
    : isDocument
    ? { idle: 'bg-sky-400 hover:bg-sky-300',      active: 'bg-sky-500' }
    : { idle: 'bg-orange-400 hover:bg-orange-300', active: 'bg-orange-500' }

  const accentTailwind = is2D ? 'bg-violet-500 hover:bg-violet-400'
    : isDocument ? 'bg-sky-500 hover:bg-sky-400'
    : isRelief   ? 'bg-orange-500 hover:bg-orange-400'
    :               'bg-slate-500 hover:bg-slate-400'

  // Pixel-exact dimensions of the video content area (replicates object-contain logic).
  // Used to constrain the orbit guide box so slider % values reference the feed, not the container.
  const videoContentStyle: React.CSSProperties = (() => {
    if (videoAR == null || containerSize == null) return { width: '100%', height: '100%' }
    const { w, h } = containerSize
    return videoAR > w / h
      ? { width: `${w}px`,           height: `${w / videoAR}px` }  // width-constrained
      : { width: `${h * videoAR}px`, height: `${h}px` }            // height-constrained
  })()

  // Same width/height numbers as videoContentStyle above, kept as plain numbers (not a CSS string)
  // so overlays scoped to that box — rather than the full container — can compute their own
  // ±90° rotate-and-scale-to-fit, matching fullBoxSpinStyle's approach at the container's scale.
  const videoContentDims = (() => {
    if (videoAR == null || containerSize == null) return null
    const { w, h } = containerSize
    return videoAR > w / h ? { w, h: w / videoAR } : { w: h * videoAR, h }
  })()

  // Native-rotation illusion: applied to UI content (icons, HUD text, controls) so it visually
  // tracks the phone's physical orientation while the surrounding layout stays portrait-locked.
  const uiSpinStyle: React.CSSProperties = { transform: `rotate(${uiRotation}deg)`, transition: 'transform 0.3s ease-out' }

  // Shared by two full-container overlays that both need to spin with uiRotation and, for a ±90°
  // swap, rescale by the container's h/w ratio so the rotated box still fills the portrait bounds:
  //  - onion-skin/silhouette ghosts, whose pixels already have ctx.rotate(-uiRotation) baked in by
  //    drawRotatedFrame — rotating the display by the exact opposite (+uiRotation) cancels that out.
  //  - the crop preview + drag overlay, which has no baked-in rotation but should still spin to
  //    match the angle the user is physically holding the phone at while dragging corners.
  const fullBoxSpinStyle: React.CSSProperties = (() => {
    const swapped = uiRotation === 90 || uiRotation === -90
    const scale = swapped && containerSize ? containerSize.h / containerSize.w : 1
    return { transform: `rotate(${uiRotation}deg) scale(${scale})`, transition: 'transform 0.3s ease-out' }
  })()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-2 flex-shrink-0" style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}>
        <button onClick={onClose} className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors" aria-label="Close">
          <X className="w-5 h-5" style={uiSpinStyle} />
        </button>
        <div className="w-9 h-9 flex-shrink-0" aria-hidden="true" />
        <button onClick={toggleFullscreen}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/75 flex-shrink-0"
          aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}>
          {isFullscreen ? <Minimize className="w-[18px] h-[18px]" style={uiSpinStyle} /> : <Maximize className="w-[18px] h-[18px]" style={uiSpinStyle} />}
        </button>
      </div>

      {/* Mode switcher */}
      <div className="flex justify-center px-5 pb-2 flex-shrink-0">
        <div className="inline-flex p-1 rounded-full bg-white/8 backdrop-blur-md border border-white/10">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onModeChange(id)}
              disabled={isCapturing || isRecording}
              className={`flex items-center gap-1.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                mode === id
                  ? 'bg-white text-zinc-900 shadow-sm pl-2.5 pr-3'
                  : 'text-white/55 hover:text-white/85 px-2.5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {mode === id && label}
            </button>
          ))}
        </div>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 overflow-hidden flex items-center justify-center min-h-0">
        <div ref={cropContainerRef} className="relative overflow-hidden w-full h-full"
          onTouchStart={handlePinchStart} onTouchMove={handlePinchMove}
          onTouchEnd={handlePinchEnd} onTouchCancel={handlePinchEnd}>

        {/* Camera-active indicator dot — pinned to top-left of video content area */}
        {cameraReady && videoAR != null && containerSize != null && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
            <div className="relative" style={videoContentStyle}>
              <div className={`absolute top-3 left-3 w-2 h-2 rounded-full animate-pulse ${
                is2D ? 'bg-violet-400' : isDocument ? 'bg-sky-400' : isRelief ? 'bg-orange-400' : 'bg-slate-400'
              }`} />
            </div>
          </div>
        )}

        {/* Hardware zoom HUD — bottom-right of video content area. Only renders when the
             active track's capabilities report zoom support (never on iOS Safari). Outer
             layers stay pointer-events-none so the pill doesn't swallow pinch touches
             elsewhere on the viewfinder; only the pill itself (and its buttons) opts back in. */}
        {supportsZoom && zoomLimits && cameraReady && videoAR != null && containerSize != null && !cropState && !(isFlat && docOverlay) && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
            <div className="relative" style={videoContentStyle}>
              <div className="absolute bottom-4 right-4 pointer-events-auto flex flex-col items-center gap-2 bg-black/30 backdrop-blur-md border border-white/20 rounded-full p-2">
                <button
                  onClick={() => handleZoomChange(zoom + zoomLimits.step)}
                  disabled={zoom >= zoomLimits.max}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
                  aria-label="Zoom in"
                >
                  <Plus className="w-3.5 h-3.5" style={uiSpinStyle} />
                </button>
                <span className="text-white text-[10px] font-mono font-semibold tabular-nums [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]" style={uiSpinStyle}>
                  {zoom.toFixed(1)}x
                </span>
                <button
                  onClick={() => handleZoomChange(zoom - zoomLimits.step)}
                  disabled={zoom <= zoomLimits.min}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
                  aria-label="Zoom out"
                >
                  <Minus className="w-3.5 h-3.5" style={uiSpinStyle} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tap-to-focus hit layer — invisible, scoped to videoFeedRef (the videoContentStyle
             box) so tap coordinates land on the actual image, not the letterbox bars. Kept
             at z-20 — below the zoom HUD's z-30 stacking context — so the zoom pill's buttons
             still win hit-testing over their own footprint; everywhere else on the live feed,
             this layer catches the tap. Pinch-to-zoom is untouched: it's still handled by the
             outer cropContainerRef's touch listeners, which this layer's taps still bubble to.
             Not rendered during crop mode / the doc-page overlay — CropOverlay's own drag
             handles need those touches, and this box has no z-index-aware way to yield to
             them otherwise. */}
        {videoAR != null && containerSize != null && !cropState && !(isFlat && docOverlay) && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
            <div ref={videoFeedRef} className="relative w-full h-full pointer-events-auto" style={videoContentStyle} onPointerDown={handleFocusTap} />
          </div>
        )}

        {/* Shutter flash + tap-to-focus reticle — purely decorative (pointer-events-none
             throughout), scoped to the same videoContentStyle box so they sit directly over
             the live image. High z-index so both paint above the video, onion skins, and HUDs. */}
        {videoAR != null && containerSize != null && (
          <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
            <div className="relative" style={videoContentStyle}>
              <div className="absolute inset-0 bg-white pointer-events-none z-40 transition-opacity duration-[175ms] ease-out" style={{ opacity: flashOpacity }} />
              {focusPoint && (
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-yellow-400 pointer-events-none z-50 animate-pulse"
                  style={{ left: focusPoint.x, top: focusPoint.y }}
                />
              )}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                  <span className="font-bold text-white/70 drop-shadow-lg" style={{ ...uiSpinStyle, fontSize: '250px', lineHeight: 1 }}>
                    {countdown}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live camera feed — hidden (not stopped) while cropping so retake works */}
        <video
          ref={setVideoRef}
          className={`absolute inset-0 w-full h-full transition-opacity duration-500 object-contain ${
            cropState ? 'opacity-0' : cameraReady ? 'opacity-100' : 'opacity-0'
          }`}
          autoPlay playsInline muted
        />

        {/* Crop mode: show captured still + draggable crop overlay. Rotated as one rigid unit so
             the user can see and drag corners aligned with the angle they're physically holding
             the phone at — CropOverlay's own drag math reads screen-space getBoundingClientRect(),
             so it stays correct under this transform without any changes to CropOverlay itself. */}
        {cropState && (
          <div className="absolute inset-0" style={fullBoxSpinStyle}>
            <img
              src={cropState.objectUrl}
              alt="Captured still"
              className="absolute inset-0 w-full h-full object-contain"
            />
            <CropOverlay
              corners={cropCorners}
              onCornersChange={setCropCorners}
              accentColor={is2D ? 'rgb(196 181 253)' : 'rgb(125 211 252)'}
            />
          </div>
        )}

        {/* Ghost / onion-skin: previous frame at 25% opacity — rotate mode only */}
        {isScan3d && !isOrbitMode && ghostUrl && (
          <img src={ghostUrl} alt="" aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ opacity: 0.25, ...fullBoxSpinStyle }}
          />
        )}

        {/* Guide box: dashed bounding box + crosshair, shown in scan3d and relief modes */}
        {(isScan3d || isRelief) && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            {/* Matches the rendered video content area so width/height % are bounded
                by the feed edges, not the full container (which may include letterbox bars). */}
            <div style={{ ...videoContentStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                className="relative border-2 border-dashed border-white/55"
                style={{
                  width: `${guideBoxWidth}%`,
                  height: `${guideBoxHeight}%`,
                  transition: (isScan3d ? currentStep : reliefStep) === 0 ? 'width 60ms linear, height 60ms linear' : 'none',
                }}
              >
                {/* Crosshair */}
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/20 -translate-x-1/2" />
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/20 -translate-y-1/2" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/55" />
                </div>
                {/* Corner accents */}
                {(['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
                  'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'] as const)
                  .map((cls, i) => (
                    <div key={i} className={`absolute w-4 h-4 border-white/80 ${cls}`} />
                  ))}
                {/* Lock badge */}
                {(isScan3d ? currentStep : reliefStep) > 0 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[9px] font-mono tracking-[0.12em] text-white/50">BOX LOCKED</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compact multi-frame progress HUD — scan3d compass dial / relief cross-section guide.
             Pinned to the bottom edge of the actual video content area so the bottom control
             deck below stays a uniform height across all four capture modes. */}
        {(isScan3d || isRelief) && cameraReady && videoAR != null && containerSize != null && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
            <div className="relative" style={videoContentStyle}>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-1.5 bg-black/30 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2">
                <div style={uiSpinStyle} className="flex flex-col items-center gap-1.5">
                <div>
                  <p className="text-white/80 text-xs font-medium text-center [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                    {isScan3d
                      ? (allFramesCaptured ? 'All 8 frames captured!' : (isOrbitMode ? ORBIT_STEPS : SCAN_STEPS)[currentStep]?.heading)
                      : (allReliefCaptured ? 'All 6 frames captured!' : RELIEF_STEPS[reliefStep]?.heading)}
                  </p>
                  <p className="text-white/50 text-[10px] text-center [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                    {isScan3d
                      ? (allFramesCaptured
                          ? 'Tap below to compile your 3D object'
                          : isOrbitMode && currentStep === 0
                          ? 'Use slider to frame subject, then capture baseline.'
                          : isOrbitMode
                          ? 'Box locked. Step right and fit subject back inside frame.'
                          : (SCAN_STEPS[currentStep]?.sub ?? ''))
                      : (allReliefCaptured ? 'Tap below to finish and save your Relief' : RELIEF_STEPS[reliefStep]?.sub)}
                  </p>
                </div>
                {isScan3d ? (
                  <CompassDial capturedFrames={capturedFrames} currentStep={currentStep} svgClassName="w-16 h-16 drop-shadow-md" isOrbitMode={isOrbitMode} />
                ) : (
                  <div className="drop-shadow-md">
                    <ReliefCrossSectionHUD capturedFrames={reliefFrames} currentStep={reliefStep} />
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2D Artwork / Document HUD — mirrors the scan3d/relief HUD pattern with instruction text only */}
        {isFlat && !cropState && tipText && cameraReady && videoAR != null && containerSize != null && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
            <div className="relative" style={videoContentStyle}>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto bg-black/30 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2">
                <p style={uiSpinStyle} className="text-white/80 text-xs font-medium text-center [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">{tipText}</p>
              </div>
            </div>
          </div>
        )}

        {/* Base texture silhouette overlay — relief steps 1–5 */}
        {isRelief && reliefStep >= 1 && baseSilhouetteUrl && (
          <img
            src={baseSilhouetteUrl}
            alt="" aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain opacity-30 z-10 pointer-events-none"
            style={fullBoxSpinStyle}
          />
        )}
        {/* Dark fallback */}
        {!cameraReady && (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 38%, #3f3f46 0%, #27272a 45%, #09090b 100%)' }} />
        )}

        {/* Loading spinner */}
        {cameraStatus === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-zinc-700 border-t-white/60 animate-spin" />
            <span className="text-white/50 text-xs font-mono tracking-[0.15em] uppercase">Connecting…</span>
          </div>
        )}

        {/* Permission / error overlay */}
        {(cameraStatus === 'denied' || cameraStatus === 'unavailable' || cameraStatus === 'error') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 z-10">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center mb-5">
              <VideoOff className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-white font-semibold text-base mb-2 text-center">
              {cameraStatus === 'denied' ? 'Camera Access Required' : cameraStatus === 'unavailable' ? 'No Camera Found' : 'Camera Unavailable'}
            </h3>
            <p className="text-zinc-400 text-xs text-center leading-relaxed mb-6 max-w-xs">
              {cameraStatus === 'denied'
                ? 'Allow camera access in your browser settings, then tap Try Again.'
                : cameraStatus === 'unavailable'
                  ? 'No camera detected. Use the gallery button below to upload a photo or video.'
                  : 'Something went wrong. Tap Try Again or upload a file instead.'}
            </p>
            {cameraStatus !== 'unavailable' && (
              <button onClick={initCamera} className={`px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-colors ${accentTailwind}`}>
                Try Again
              </button>
            )}
          </div>
        )}

        {/* ── Side-profile phone tilt icons for relief180 steps 1–5 (no grid lines —
             the grid-cols-6 alignment grid below is the only divider overlay in Relief mode).
             The whole wrapper spins with uiRotation (pills AND labels together, as one rigid
             layout) so it stays aligned with the user's actual horizon when held in landscape. */}
        {isRelief && reliefStep >= 1 && !allReliefCaptured && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          <div style={{ ...videoContentStyle }} className="relative">
          <div
            className="absolute inset-0 flex"
            style={{
              transform: `rotate(${uiRotation}deg) scale(${
                (uiRotation === 90 || uiRotation === -90) && videoContentDims
                  ? videoContentDims.h / videoContentDims.w
                  : 1
              })`,
              transition: 'transform 0.3s ease-out',
            }}
          >
            {([
              { step: 1, label: 'XL', baseDeg: -60 },
              { step: 2, label: 'LC', baseDeg: -30 },
              { step: 3, label: 'TD', baseDeg: 0   },
              { step: 4, label: 'RC', baseDeg: 30  },
              { step: 5, label: 'XR', baseDeg: 60  },
            ] as const).map(({ step, label, baseDeg }) => {
              const isActive   = step === reliefStep
              const isCaptured = reliefFrames[step] !== null
              return (
                <div key={step} className="relative flex-1 flex flex-col items-center justify-center">
                  {isActive && (
                    <div
                      className="w-12 h-2.5 bg-orange-400/90 rounded-full"
                      style={{ transform: `rotate(${baseDeg}deg)` }}
                    />
                  )}
                  <span className={`absolute bottom-3 text-[9px] font-mono ${
                    isActive ? 'text-orange-400/90 font-bold' : isCaptured ? 'text-orange-400/55' : 'text-white/20'
                  }`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
          </div>
          </div>
        )}

        {/* ── Between-pages overlay (artwork2d + document) ── */}
        {isFlat && docOverlay && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-sm">
            <div className="mx-5 w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800">

              <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    is2D ? 'bg-violet-500/15 dark:bg-violet-500/20' : 'bg-sky-500/15 dark:bg-sky-500/20'
                  }`}>
                    <CheckCircle2 className={`w-5 h-5 ${is2D ? 'text-violet-500' : 'text-sky-500'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-zinc-100 text-sm leading-snug">
                      Page {docPages.length} Captured
                    </p>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
                      {docPages.length === 1
                        ? 'Position the next page, or save now.'
                        : `${docPages.length} pages captured so far.`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {docPages.map((_, i) => (
                    <div key={i} className={`flex items-center gap-1 border rounded-full px-2 py-0.5 ${
                      is2D
                        ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900/50'
                        : 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/50'
                    }`}>
                      <CheckCircle2 className={`w-2.5 h-2.5 flex-shrink-0 ${is2D ? 'text-violet-500' : 'text-sky-500'}`} />
                      <span className={`text-[10px] font-semibold ${is2D ? 'text-violet-700 dark:text-violet-400' : 'text-sky-700 dark:text-sky-400'}`}>p.{i + 1}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 border border-dashed border-slate-300 dark:border-zinc-700 rounded-full px-2 py-0.5">
                    <span className="text-slate-400 dark:text-zinc-500 text-[10px]">p.{docPages.length + 1}?</span>
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-2">
                <button
                  onClick={dismissDocOverlay}
                  className={`w-full flex items-center justify-center gap-2 text-white font-semibold text-sm py-3 rounded-2xl transition-colors ${
                    is2D ? 'bg-violet-500 hover:bg-violet-400 active:bg-violet-600' : 'bg-sky-500 hover:bg-sky-400 active:bg-sky-600'
                  }`}
                >
                  {is2D ? <Palette className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  Capture Page {docPages.length + 1}
                </button>
                <button
                  onClick={finishDocument}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium text-sm py-3 rounded-2xl border border-slate-200 dark:border-zinc-700 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {`Finish & Save (${docPages.length} ${docPages.length === 1 ? 'page' : 'pages'})`}
                </button>
              </div>
            </div>
          </div>
        )}


        </div>
      </div>

      {/* ── Crop confirmation controls ── */}
      {cropState ? (
        <div className="flex-shrink-0 flex flex-col items-center gap-2 px-5 pt-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="text-center px-3">
            <p className="text-white/90 font-semibold text-sm leading-tight">Adjust your crop</p>
            <p className="text-white/40 text-xs mt-0.5 leading-relaxed">
              Drag the corner handles to match the exact edges of your memory
            </p>
          </div>
          <div className="flex w-full gap-3">
            <button
              onClick={cancelCrop}
              className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white/70 text-sm font-medium transition-colors"
            >
              Retake
            </button>
            <button
              onClick={confirmCrop}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-sm transition-colors ${accentTailwind}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Crop
            </button>
          </div>
        </div>

      ) : isScan3d ? (
        <div className="flex-shrink-0 flex flex-col items-center gap-2 px-5 pt-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>

          {/* Compile CTA or shutter */}
          {allFramesCaptured ? (
            <button
              onClick={compileScan3D}
              className="w-full flex items-center justify-center gap-2.5 bg-slate-500 hover:bg-slate-400 active:bg-slate-600 text-white font-bold text-sm py-3.5 rounded-2xl transition-colors shadow-lg shadow-slate-500/20"
            >
              <Box className="w-5 h-5" />
              Compile & Save 3D Object
            </button>
          ) : (
            <div className="w-full flex justify-center">
              <div className="flex items-center">
                {/* Left zone: fixed equal width, 2D trackpad for box width/height; invisible after step 0 */}
                <div className={`w-28 flex items-center justify-center${currentStep !== 0 ? ' invisible' : ''}`}>
                  <div style={uiSpinStyle}>
                    <BoxTrackpad
                      width={guideBoxWidth}
                      height={guideBoxHeight}
                      onChange={(w, h) => { setGuideBoxWidth(w); setGuideBoxHeight(h) }}
                      disabled={currentStep !== 0}
                    />
                  </div>
                </div>

                <div className="w-10 flex-shrink-0" aria-hidden="true" />

                {/* Shutter button, wrapped in a progress ring showing frames captured / 8 */}
                <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                  <ShutterProgressRing progress={(currentStep / 8) * 100} />
                  <button
                    onClick={handleShutterClick}
                    disabled={!cameraReady || isCapturing}
                    className="relative w-20 h-20 rounded-full border-4 border-white/28 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
                    aria-label="Capture scan frame"
                  >
                    <div className={`w-14 h-14 rounded-full transition-colors duration-150 ${
                      isCapturing ? 'bg-slate-500' : 'bg-slate-400 hover:bg-slate-300'
                    }`} />
                    {isCapturing && (
                      <div className="absolute inset-0 rounded-full border-4 border-slate-400 animate-ping opacity-20" />
                    )}
                  </button>
                </div>

                <div className="w-10 flex-shrink-0" aria-hidden="true" />

                {/* Right zone: fixed equal width, timer toggle + 3D Mode label + stacked Rotate / Orbit buttons */}
                <div className="w-28 flex flex-col items-center justify-center gap-1.5">
                  <button
                    onClick={() => setTimerOn(v => !v)}
                    className="w-7 h-7 rounded-full flex items-center justify-center border transition-colors"
                    style={{
                      color: timerOn ? '#22c55e' : '#ef4444',
                      backgroundColor: timerOn ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                      borderColor: timerOn ? '#22c55e' : '#ef4444',
                    }}
                    aria-label={timerOn ? 'Disable capture timer' : 'Enable 3-second capture timer'}
                  >
                    <Timer className="w-3.5 h-3.5" style={uiSpinStyle} />
                  </button>
                  <div style={uiSpinStyle} className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-1">
                      <Box className={`w-3 h-3 flex-shrink-0 transition-colors ${!isOrbitMode ? 'text-slate-400' : 'text-white/30'}`} />
                      <span className="text-white/50 text-[9px] font-medium">3D Mode</span>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-white/8 rounded-xl p-0.5">
                      <button
                        onClick={() => handleOrbitToggle(false)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                          !isOrbitMode ? 'bg-white/20 text-white shadow-sm' : 'text-white/35 hover:text-white/60'
                        }`}
                      >
                        Rotate
                      </button>
                      <button
                        onClick={() => handleOrbitToggle(true)}
                        className={`flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                          isOrbitMode
                            ? 'bg-slate-500 text-white shadow-sm shadow-slate-500/30'
                            : 'text-white/35 hover:text-white/60'
                        }`}
                      >
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                          <circle cx="6" cy="6" r="1.5" fill="currentColor" stroke="none" />
                          <circle cx="6" cy="6" r="4.5" strokeDasharray="2 1.5" />
                        </svg>
                        Orbit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      ) : isRelief ? (
        /* ── relief180: controls ── */
        <div className="flex-shrink-0 flex flex-col items-center gap-2 px-5 pt-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>

          {/* Compile CTA or shutter */}
          {allReliefCaptured ? (
            <button
              onClick={compileRelief}
              className="w-full flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-sm py-3.5 rounded-2xl transition-colors shadow-lg shadow-orange-500/20"
            >
              <Mountain className="w-5 h-5" />
              Finish & Save Relief
            </button>
          ) : (
            <div className="w-full flex justify-center">
              <div className="flex items-center">
                {/* Left zone: fixed equal width, 2D trackpad for box width/height; invisible after step 0 */}
                <div className={`w-28 flex items-center justify-center${reliefStep !== 0 ? ' invisible' : ''}`}>
                  <div style={uiSpinStyle}>
                    <BoxTrackpad
                      width={guideBoxWidth}
                      height={guideBoxHeight}
                      onChange={(w, h) => { setGuideBoxWidth(w); setGuideBoxHeight(h) }}
                      disabled={reliefStep !== 0}
                    />
                  </div>
                </div>

                <div className="w-10 flex-shrink-0" aria-hidden="true" />

                {/* Shutter button, wrapped in a progress ring showing frames captured / 6 */}
                <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                  <ShutterProgressRing progress={(reliefStep / 6) * 100} />
                  <button
                    onClick={handleShutterClick}
                    disabled={!cameraReady || isCapturing}
                    className="relative w-20 h-20 rounded-full border-4 border-white/28 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
                    aria-label="Capture relief frame"
                  >
                    <div className={`w-14 h-14 rounded-full transition-colors duration-150 ${
                      isCapturing ? 'bg-orange-500' : 'bg-orange-400 hover:bg-orange-300'
                    }`} />
                    {isCapturing && (
                      <div className="absolute inset-0 rounded-full border-4 border-orange-400 animate-ping opacity-20" />
                    )}
                  </button>
                </div>

                <div className="w-10 flex-shrink-0" aria-hidden="true" />

                {/* Right zone: fixed equal width, timer toggle + Lighting label + stacked Natural / Flashlight buttons */}
                <div className="w-28 flex flex-col items-center justify-center gap-1.5">
                  <button
                    onClick={() => setTimerOn(v => !v)}
                    className="w-7 h-7 rounded-full flex items-center justify-center border transition-colors"
                    style={{
                      color: timerOn ? '#22c55e' : '#ef4444',
                      backgroundColor: timerOn ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                      borderColor: timerOn ? '#22c55e' : '#ef4444',
                    }}
                    aria-label={timerOn ? 'Disable capture timer' : 'Enable 3-second capture timer'}
                  >
                    <Timer className="w-3.5 h-3.5" style={uiSpinStyle} />
                  </button>
                  <div style={uiSpinStyle} className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-1">
                      <Lightbulb className={`w-3 h-3 flex-shrink-0 transition-colors ${lightingMode === 'torch' ? 'text-orange-400' : 'text-white/35'}`} />
                      <span className="text-white/50 text-[9px] font-medium">Lighting</span>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-white/8 rounded-xl p-0.5">
                      <button
                        onClick={() => setLightingMode('natural')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                          lightingMode === 'natural'
                            ? 'bg-white/20 text-white shadow-sm'
                            : 'text-white/35 hover:text-white/60'
                        }`}
                      >
                        Natural
                      </button>
                      <button
                        onClick={() => setLightingMode('torch')}
                        className={`flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                          lightingMode === 'torch'
                            ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                            : 'text-white/35 hover:text-white/60'
                        }`}
                      >
                        <Zap className="w-2.5 h-2.5" />
                        Flashlight
                      </button>
                      {torchUnsupported && (
                        <span className="text-[9px] text-orange-400/65 text-center">n/a</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      ) : (
        /* ── Standard bottom controls (artwork2d, document) ── */
        <div className="flex-shrink-0 pt-2" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="w-full flex justify-center">
            <div className="flex items-center">

              {/* Left zone: upload button */}
              <div className="w-28 flex items-center justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCapturing || docOverlay}
                  className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/55 hover:text-white transition-colors disabled:opacity-40"
                  aria-label="Upload from gallery"
                >
                  <Images className="w-5 h-5" style={uiSpinStyle} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
              </div>

              <div className="w-10 flex-shrink-0" aria-hidden="true" />

              {/* Shutter button */}
              <button
                onClick={handleShutterClick}
                disabled={!cameraReady || isCapturing || (isFlat && docOverlay)}
                className="relative flex-shrink-0 w-20 h-20 rounded-full border-4 border-white/28 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
                aria-label={isFlat ? 'Capture page' : 'Take photo'}
              >
                <div className={`w-14 h-14 rounded-full transition-colors duration-150 ${
                  isCapturing ? accentBtn.active : accentBtn.idle
                }`} />
                {isCapturing && (
                  <div className={`absolute inset-0 rounded-full border-4 animate-ping opacity-20 ${
                    is2D ? 'border-violet-400' : isDocument ? 'border-sky-400' : 'border-slate-400'
                  }`} />
                )}
              </button>

              <div className="w-10 flex-shrink-0" aria-hidden="true" />

              {/* Right zone: timer toggle + level indicator (2D Artwork) or spacer (Document) */}
              <div className="w-28 flex flex-col items-center justify-center gap-1.5">
                <button
                  onClick={() => setTimerOn(v => !v)}
                  className="w-7 h-7 rounded-full flex items-center justify-center border transition-colors"
                  style={{
                    color: timerOn ? '#22c55e' : '#ef4444',
                    backgroundColor: timerOn ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                    borderColor: timerOn ? '#22c55e' : '#ef4444',
                  }}
                  aria-label={timerOn ? 'Disable capture timer' : 'Enable 3-second capture timer'}
                >
                  <Timer className="w-3.5 h-3.5" style={uiSpinStyle} />
                </button>
                {(is2D || isDocument) && cameraReady ? (
                  <div style={uiSpinStyle} className="flex flex-col items-center gap-1">
                    <div className={`relative w-11 h-11 rounded-full border-2 transition-all duration-300 ${
                      isLevel ? 'border-emerald-400/80 bg-emerald-500/10' : 'border-red-400/60 bg-red-500/10'
                    }`}>
                      <div className="absolute inset-0 flex items-center pointer-events-none">
                        <div className="w-full h-px bg-white/25" />
                      </div>
                      <div className="absolute inset-0 flex justify-center pointer-events-none">
                        <div className="h-full w-px bg-white/25" />
                      </div>
                      <div className={`absolute inset-2.5 rounded-full border transition-colors duration-300 ${
                        isLevel ? 'border-emerald-400/45' : 'border-red-400/30'
                      }`} />
                      <div
                        className={`absolute w-3.5 h-3.5 rounded-full shadow-md transition-colors duration-300 ${
                          isLevel ? 'bg-emerald-400' : 'bg-red-400'
                        }`}
                        style={{
                          top: '50%', left: '50%',
                          transform: `translate(calc(-50% + ${bubbleX}px), calc(-50% + ${bubbleY}px))`,
                          transition: 'transform 150ms ease-out, background-color 300ms',
                        }}
                      />
                    </div>
                    <span className={`text-[9px] font-mono tracking-wider transition-colors duration-300 ${
                      isLevel ? 'text-emerald-400' : 'text-red-400/80'
                    }`}>
                      {isLevel ? 'LEVEL' : 'TILT'}
                    </span>
                  </div>
                ) : (
                  <div className="w-11 h-11 flex-shrink-0" aria-hidden="true" />
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

