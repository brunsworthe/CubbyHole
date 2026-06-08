'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Lightbulb, RotateCcw, Info, Box, Palette, FileText } from 'lucide-react'
import type { CaptureMode } from './CaptureFlow'

const MODES: { id: CaptureMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'scan3d', label: '3D Object', icon: Box },
  { id: 'artwork2d', label: '2D Masterpiece', icon: Palette },
  { id: 'document', label: 'Document Scanner', icon: FileText },
]

interface Props {
  mode: CaptureMode
  onModeChange: (mode: CaptureMode) => void
  onCapture: () => void
  onClose: () => void
}

const ORBIT_CX = 150
const ORBIT_CY = 312
const ORBIT_RX = 88
const ORBIT_RY = 20

const RING_CX = 150
const RING_CY = 190
const RING_R = 52
const RING_CIRC = 2 * Math.PI * RING_R

export default function CaptureScreen({ mode, onModeChange, onCapture, onClose }: Props) {
  const [orbitAngle, setOrbitAngle] = useState(0)
  const [scanProgress, setScanProgress] = useState(0)
  const [isCapturing, setIsCapturing] = useState(false)

  const is2D = mode === 'artwork2d'
  const isDocument = mode === 'document'
  const isFlat = mode !== 'scan3d'
  const accent = is2D ? 'rgb(196 181 253)' : isDocument ? 'rgb(125 211 252)' : 'rgb(251 191 36)'
  const pointColor = is2D ? 'rgb(196 181 253)' : isDocument ? 'rgb(125 211 252)' : 'rgb(110 231 183)'

  // Smooth orbit dot animation via rAF
  useEffect(() => {
    let rafId: number
    let last = 0
    const step = (t: number) => {
      if (t - last > 14) {
        setOrbitAngle((a) => (a + 0.9) % 360)
        last = t
      }
      rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const handleCapture = useCallback(() => {
    if (isCapturing) return
    setIsCapturing(true)
    let p = 0
    const tick = setInterval(() => {
      p += 1.6
      setScanProgress(Math.min(p, 100))
      if (p >= 100) {
        clearInterval(tick)
        setTimeout(onCapture, 350)
      }
    }, 38)
  }, [isCapturing, onCapture])

  // Orbit dot position (3D mode)
  const rad = (orbitAngle * Math.PI) / 180
  const dotX = ORBIT_CX + ORBIT_RX * Math.sin(rad)
  const dotY = ORBIT_CY - ORBIT_RY * Math.cos(rad)

  // Orbit coverage arc path (3D mode)
  const coverageAngle = (scanProgress / 100) * 2 * Math.PI
  const arcEndX = ORBIT_CX + ORBIT_RX * Math.sin(coverageAngle)
  const arcEndY = ORBIT_CY - ORBIT_RY * Math.cos(coverageAngle)
  const largeArc = scanProgress > 50 ? 1 : 0
  const coveragePath =
    scanProgress > 0 && scanProgress < 100
      ? `M ${ORBIT_CX} ${ORBIT_CY - ORBIT_RY} A ${ORBIT_RX} ${ORBIT_RY} 0 ${largeArc} 1 ${arcEndX} ${arcEndY}`
      : ''

  // Flat-scan circular progress ring (2D mode)
  const ringOffset = RING_CIRC * (1 - scanProgress / 100)

  const hudLabel = is2D ? 'ALIGN ARTWORK' : isDocument ? 'ALIGN DOCUMENT' : 'ALIGN OBJECT'
  const tipText = isCapturing
    ? is2D
      ? 'Hold steady — capturing every brushstroke and texture'
      : isDocument
        ? 'Hold steady — scanning each page in sequence'
        : 'Keep moving — slowly orbit all the way around the object'
    : is2D
      ? 'Lay the artwork flat and hold your phone steady above it'
      : isDocument
        ? 'Place each page flat within the frame, one at a time'
        : 'Center the object inside the guide, then press Scan'

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${is2D ? 'bg-violet-400' : isDocument ? 'bg-sky-400' : 'bg-amber-400'}`} />
          <span className="text-white/75 text-xs font-mono tracking-[0.15em] uppercase">
            {is2D ? 'Vision AI Active' : isDocument ? 'OCR Engine Active' : 'LiDAR Active'}
          </span>
        </div>
        <button
          className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle flash"
        >
          <Lightbulb className="w-5 h-5" />
        </button>
      </div>

      {/* Mode switcher */}
      <div className="flex justify-center px-5 pb-3 flex-shrink-0">
        <div className="inline-flex p-1 rounded-full bg-white/8 backdrop-blur-md border border-white/10">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onModeChange(id)}
              disabled={isCapturing}
              className={`flex items-center gap-1.5 pl-3 pr-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                mode === id ? 'bg-white text-zinc-900 shadow-sm' : 'text-white/55 hover:text-white/85'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {/* Simulated camera background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 38%, #3f3f46 0%, #27272a 45%, #09090b 100%)',
          }}
        />

        {/* SVG scanning overlay */}
        <svg
          viewBox="0 0 300 440"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Depth / feature point cloud (decorative) */}
          {([
            [98, 128, 0.40], [158, 108, 0.50], [208, 136, 0.30],
            [84, 190, 0.35], [186, 168, 0.45], [228, 196, 0.30],
            [106, 248, 0.40], [172, 256, 0.35], [202, 228, 0.50],
            [124, 206, 0.30], [152, 150, 0.45], [190, 210, 0.40],
            [118, 170, 0.30], [238, 162, 0.35], [70, 218, 0.40],
            [144, 130, 0.28], [220, 240, 0.38], [92, 155, 0.42],
          ] as [number, number, number][]).map(([x, y, o], i) => (
            <circle key={i} cx={x} cy={y} r="1.8" fill={pointColor} opacity={o} />
          ))}

          {/* Alignment frame — dashed border */}
          <rect
            x="58" y="72" width="184" height="236"
            fill="none"
            stroke="white" strokeWidth="0.7" strokeOpacity="0.22" strokeDasharray="6 4"
          />

          {/* Interior mesh grid */}
          <g opacity="0.10" stroke="white" strokeWidth="0.5">
            {[90, 120, 150, 180, 210].map((x) => (
              <line key={x} x1={x} y1="72" x2={x} y2="308" />
            ))}
            {[108, 148, 188, 228, 268].map((y) => (
              <line key={y} x1="58" y1={y} x2="242" y2={y} />
            ))}
          </g>

          {/* Corner brackets */}
          <g filter="url(#glow)" stroke={accent} strokeWidth="2.5" strokeLinecap="round" fill="none">
            <path d="M 58 112 L 58 72 L 98 72" />
            <path d="M 202 72 L 242 72 L 242 112" />
            <path d="M 58 268 L 58 308 L 98 308" />
            <path d="M 202 308 L 242 308 L 242 268" />
          </g>

          {/* Animated scan line */}
          <line x1="60" x2="240" stroke={accent} strokeWidth="1" strokeOpacity="0.75">
            <animate attributeName="y1" values="74;306;74" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="y2" values="74;306;74" dur="2.6s" repeatCount="indefinite" />
          </line>
          <line x1="60" x2="240" stroke="white" strokeWidth="0.35" strokeOpacity="0.5">
            <animate attributeName="y1" values="74;306;74" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="y2" values="74;306;74" dur="2.6s" repeatCount="indefinite" />
          </line>

          {/* HUD labels */}
          <text x="60" y="65" fill={accent} fontSize="7.5" fontFamily="monospace" opacity="0.65" letterSpacing="1">{hudLabel}</text>
          <text x="240" y="65" fill="white" fontSize="7.5" fontFamily="monospace" opacity="0.40" letterSpacing="0.5" textAnchor="end">
            {isFlat ? 'FLAT · 0°' : '~0.4 m'}
          </text>

          {isFlat ? (
            <>
              {/* Flat-scan circular progress ring */}
              <circle cx={RING_CX} cy={RING_CY} r={RING_R} fill="none" stroke="white" strokeWidth="0.8" strokeOpacity="0.16" />
              <circle
                cx={RING_CX} cy={RING_CY} r={RING_R} fill="none"
                stroke={accent} strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={ringOffset}
                transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
                opacity={scanProgress > 0 ? 0.9 : 0}
                style={{ transition: 'opacity 200ms, stroke-dashoffset 60ms linear' }}
              />
              {/* Center reticle */}
              <g stroke="white" strokeWidth="0.8" strokeOpacity="0.45" fill="none">
                <circle cx={RING_CX} cy={RING_CY} r="3.5" />
                <line x1={RING_CX - 9} y1={RING_CY} x2={RING_CX + 9} y2={RING_CY} />
                <line x1={RING_CX} y1={RING_CY - 9} x2={RING_CX} y2={RING_CY + 9} />
              </g>
              {/* Pulse ring while capturing */}
              {isCapturing && (
                <circle cx={RING_CX} cy={RING_CY} r={RING_R} fill="none" stroke={accent} strokeWidth="1" opacity="0.5">
                  <animate attributeName="r" values={`${RING_R};${RING_R + 22}`} dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
            </>
          ) : (
            <>
              {/* Center crosshair */}
              <g stroke="white" strokeWidth="0.8" strokeOpacity="0.45" fill="none">
                <circle cx="150" cy="190" r="3.5" />
                <line x1="141" y1="190" x2="159" y2="190" />
                <line x1="150" y1="181" x2="150" y2="199" />
              </g>

              {/* Orbit ellipse guide */}
              <ellipse
                cx={ORBIT_CX} cy={ORBIT_CY} rx={ORBIT_RX} ry={ORBIT_RY}
                fill="none" stroke="white" strokeWidth="0.8" strokeOpacity="0.18" strokeDasharray="4 3"
              />

              {/* Scan coverage arc */}
              {coveragePath && (
                <path
                  d={coveragePath}
                  fill="none"
                  stroke={accent}
                  strokeWidth="2.5"
                  strokeOpacity="0.88"
                  strokeLinecap="round"
                />
              )}

              {/* Orbit dot */}
              <circle cx={dotX} cy={dotY} r="4.5" fill={accent} opacity="0.95" />
              <circle cx={dotX} cy={dotY} r="8.5" fill="none" stroke={accent} strokeWidth="1" opacity="0.30" />
            </>
          )}

          {/* Scanning progress overlay */}
          {isCapturing && (
            <>
              <rect x="94" y="172" width="112" height="40" rx="5" fill="black" fillOpacity="0.65" />
              <text x="150" y="187" fill={accent} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="2">
                {isFlat ? 'CAPTURING' : 'SCANNING'}
              </text>
              <text x="150" y="203" fill="white" fontSize="13" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                {`${Math.round(scanProgress)}%`}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Tip text */}
      <div className="flex-shrink-0 px-6 py-2">
        <p className="text-center text-white/38 text-xs leading-relaxed tracking-wide">{tipText}</p>
      </div>

      {/* Bottom controls */}
      <div className="flex-shrink-0 flex items-center justify-around px-10 pb-14 pt-2">
        <button className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/55 hover:text-white transition-colors">
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* Capture button */}
        <button
          onClick={handleCapture}
          disabled={isCapturing}
          className="relative w-20 h-20 rounded-full border-4 border-white/28 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-60"
          aria-label="Start scan"
        >
          <div
            className={`w-14 h-14 rounded-full transition-colors duration-150 ${
              is2D
                ? isCapturing ? 'bg-violet-500' : 'bg-violet-400 hover:bg-violet-300'
                : isDocument
                  ? isCapturing ? 'bg-sky-500' : 'bg-sky-400 hover:bg-sky-300'
                  : isCapturing ? 'bg-amber-500' : 'bg-amber-400 hover:bg-amber-300'
            }`}
          />
          {isCapturing && (
            <div className={`absolute inset-0 rounded-full border-4 animate-ping opacity-20 ${
              is2D ? 'border-violet-400' : isDocument ? 'border-sky-400' : 'border-amber-400'
            }`} />
          )}
        </button>

        <button className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/55 hover:text-white transition-colors">
          <Info className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
