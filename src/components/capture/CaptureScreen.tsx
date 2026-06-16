'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Lightbulb, Info, Box, Palette, FileText, Mountain, VideoOff, Images, CheckCircle2, Zap } from 'lucide-react'
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

const ORBIT_CX = 150, ORBIT_CY = 312, ORBIT_RX = 88, ORBIT_RY = 20
const RING_CX = 150, RING_CY = 190, RING_R = 52
const RING_CIRC = 2 * Math.PI * RING_R

// 5 evenly-spaced angular positions along the upper semi-ellipse (in degrees, 0=top, ±90=endpoints)
const RELIEF_ARC_ANGLES = [-72, -36, 0, 36, 72] as const

type CameraStatus = 'requesting' | 'active' | 'denied' | 'unavailable' | 'error'

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
}

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
      <circle cx={cx} cy={cy} r={ro + 9} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

      {SCAN_STEPS.map((step, i) => {
        const isCaptured = capturedFrames[i] !== null
        const isActive   = i === currentStep && !allCaptured
        const [mx, my]   = midPt(i, (ro + ri) / 2)
        const [lx, ly]   = midPt(i, ro + 13)

        const fill   = isCaptured ? 'rgba(251,191,36,0.50)'
                     : isActive   ? 'rgba(251,191,36,0.88)'
                     :               'rgba(251,191,36,0.07)'
        const stroke = isCaptured ? 'rgba(251,191,36,0.65)'
                     : isActive   ? 'rgba(251,191,36,1)'
                     :               'rgba(251,191,36,0.20)'
        const labelFill = isCaptured ? 'rgba(251,191,36,0.70)'
                        : isActive   ? 'rgba(255,255,255,0.95)'
                        :               'rgba(255,255,255,0.22)'

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
      <circle cx={cx} cy={cy} r={ri - 3} fill="none" stroke="rgba(251,191,36,0.18)" strokeWidth="1" />

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

// ── Arc dial for 6-step relief180 capture (1 base + 5 arc) ──────────────────
function ReliefArcDial({ capturedFrames, currentStep, svgClassName = 'w-40 h-40' }: {
  capturedFrames: (Blob | null)[]
  currentStep: number
  svgClassName?: string
}) {
  const cx = 100, cy = 95
  const ro = 66, ri = 41
  const GAP = 4
  const STEP_DEG = 36

  function pt(a: number, r: number): [number, number] {
    const rad = a * Math.PI / 180
    return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)]
  }

  function segPath(i: number): string {
    const s = -90 + i * STEP_DEG + GAP
    const e = -90 + (i + 1) * STEP_DEG - GAP
    const [x1, y1] = pt(s, ro)
    const [x2, y2] = pt(e, ro)
    const [x3, y3] = pt(e, ri)
    const [x4, y4] = pt(s, ri)
    return `M ${x1} ${y1} A ${ro} ${ro} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${ri} ${ri} 0 0 0 ${x4} ${y4} Z`
  }

  const allCaptured = currentStep >= 6
  const ARC_LABELS = ['XL', 'L', 'TD', 'R', 'XR']
  // Midpoint angle for each arc segment (for phone guide placement)
  const ARC_MID_ANGLES = [-72, -36, 0, 36, 72] as const

  // BASE slot indicator
  const baseFrame = capturedFrames[0]
  const baseActive = currentStep === 0 && !allCaptured
  const baseFill   = baseFrame  ? 'rgba(251,146,60,0.50)' : baseActive ? 'rgba(251,146,60,0.88)' : 'rgba(251,146,60,0.07)'
  const baseStroke = baseFrame  ? 'rgba(251,146,60,0.65)' : baseActive ? 'rgba(251,146,60,1)'    : 'rgba(251,146,60,0.20)'

  return (
    <svg viewBox="0 0 200 200" className={svgClassName} aria-hidden="true">
      {/* Outer guide arc */}
      <path d={`M ${cx - ro - 7} ${cy} A ${ro + 7} ${ro + 7} 0 0 1 ${cx + ro + 7} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

      {/* BASE slot — flat rectangle below arc centerline */}
      <rect x={cx - 16} y={cy + 10} width="32" height="20" rx="4"
        fill={baseFill} stroke={baseStroke} strokeWidth={baseActive ? 1.5 : 1} />
      {baseActive && (
        <rect x={cx - 16} y={cy + 10} width="32" height="20" rx="4"
          fill="none" stroke="rgba(251,146,60,0.4)" strokeWidth="3">
          <animate attributeName="opacity" values="0.7;0;0.7" dur="1.6s" repeatCount="indefinite" />
        </rect>
      )}
      {baseFrame ? (
        <path d={`M ${cx - 6} ${cy + 20} L ${cx - 3} ${cy + 23} L ${cx + 7} ${cy + 15}`}
          fill="none" stroke="rgba(251,146,60,0.95)" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <text x={cx} y={cy + 24} textAnchor="middle"
          fill={baseActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)'}
          fontSize="7.5" fontFamily="monospace" fontWeight={baseActive ? 'bold' : 'normal'}>BASE</text>
      )}

      {/* Arc segments (steps 1–5, mapped to frames[1]–frames[5]) */}
      {[0, 1, 2, 3, 4].map(i => {
        const frameIdx  = i + 1
        const isCaptured = capturedFrames[frameIdx] !== null
        const isActive   = frameIdx === currentStep && !allCaptured
        const [mx, my]   = pt(-90 + (i + 0.5) * STEP_DEG, (ro + ri) / 2)
        const [lx, ly]   = pt(-90 + (i + 0.5) * STEP_DEG, ro + 13)

        const fill      = isCaptured ? 'rgba(251,146,60,0.50)' : isActive ? 'rgba(251,146,60,0.88)' : 'rgba(251,146,60,0.07)'
        const stroke    = isCaptured ? 'rgba(251,146,60,0.65)' : isActive ? 'rgba(251,146,60,1)'    : 'rgba(251,146,60,0.20)'
        const labelFill = isCaptured ? 'rgba(251,146,60,0.70)' : isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.22)'

        return (
          <g key={i}>
            <path d={segPath(i)} fill={fill} stroke={stroke} strokeWidth={isActive ? 1.5 : 1} />
            {isActive && (
              <path d={segPath(i)} fill="none" stroke="rgba(251,146,60,0.4)" strokeWidth="3">
                <animate attributeName="opacity" values="0.7;0;0.7" dur="1.6s" repeatCount="indefinite" />
              </path>
            )}
            {isCaptured && (
              <path d={`M ${mx - 4} ${my} L ${mx - 1} ${my + 3} L ${mx + 4.5} ${my - 3.5}`}
                fill="none" stroke="rgba(251,146,60,0.95)" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            )}
            <text x={lx} y={ly + 3.5} textAnchor="middle" fill={labelFill}
              fontSize="8.5" fontFamily="monospace" fontWeight={isActive ? 'bold' : 'normal'}>
              {ARC_LABELS[i]}
            </text>
          </g>
        )
      })}

      {/* Phone placement guide — points to the NEXT position */}
      {!allCaptured && (() => {
        if (currentStep === 0) {
          // BASE: flat/landscape phone icon centered below the arc
          return (
            <g transform={`translate(${cx}, ${cy + 20})`} opacity="0.82">
              <rect x="-11" y="-7" width="22" height="14" rx="3"
                fill="rgba(251,146,60,0.18)" stroke="rgba(251,146,60,0.90)" strokeWidth="1.3" />
              <rect x="-9" y="-5" width="18" height="10" rx="2"
                fill="rgba(251,146,60,0.10)" stroke="rgba(251,146,60,0.38)" strokeWidth="0.6" />
              <circle cx="8" cy="0" r="1.6" fill="rgba(251,146,60,0.70)" />
            </g>
          )
        }
        if (currentStep >= 1 && currentStep <= 5) {
          const arcIdx = currentStep - 1
          const angle = ARC_MID_ANGLES[arcIdx]
          const [px, py] = pt(angle, (ro + ri) / 2)
          return (
            <g transform={`translate(${px}, ${py}) rotate(${angle})`} opacity="0.85">
              <rect x="-6" y="-11" width="12" height="22" rx="3"
                fill="rgba(251,146,60,0.18)" stroke="rgba(251,146,60,0.90)" strokeWidth="1.3" />
              <rect x="-4.5" y="-9" width="9" height="18" rx="2"
                fill="rgba(251,146,60,0.10)" stroke="rgba(251,146,60,0.38)" strokeWidth="0.6" />
              <circle cx="0" cy="-7" r="1.6" fill="rgba(251,146,60,0.70)" />
            </g>
          )
        }
        return null
      })()}

      {/* Counter */}
      {allCaptured ? (
        <>
          <text x={cx} y={cy - 8} textAnchor="middle" fill="rgba(251,146,60,1)" fontSize="18" fontWeight="bold">✓</text>
          <text x={cx} y={cy + 4} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7.5" fontFamily="monospace">ALL DONE</text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="monospace">
            {currentStep + 1}
          </text>
          <text x={cx} y={cy + 3} textAnchor="middle" fill="rgba(255,255,255,0.38)" fontSize="8" fontFamily="monospace">/ 6</text>
        </>
      )}
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
        stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinecap="round" />
      {[28, 46, 64, 82, 100, 118, 136, 154, 172].map(x => (
        <line key={x} x1={x} y1={cy} x2={x - 4} y2={cy + 6}
          stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
      ))}
      {/* Dashed arc */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(251,146,60,0.28)" strokeWidth="1.2" strokeDasharray="4 3" />
      {/* Overhead guide */}
      <line x1={cx} y1={cy - r - 4} x2={cx} y2={cy}
        stroke="rgba(255,255,255,0.11)" strokeWidth="0.8" strokeDasharray="2 2" />

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
              fill={active ? 'rgba(251,146,60,0.95)' : captured ? 'rgba(251,146,60,0.58)' : 'rgba(255,255,255,0.26)'} />
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
              fill={active ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.33)'}
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
  const [orbitAngle, setOrbitAngle] = useState(0)
  const [scanProgress, setScanProgress] = useState(0)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  // ── Document multi-page state ─────────────────────────────────────────────
  const [docPages, setDocPages] = useState<Blob[]>([])
  const [docOverlay, setDocOverlay] = useState(false)

  // ── Crop state (artwork2d + document) ────────────────────────────────────
  type CropState = { blob: Blob; objectUrl: string; pendingMode: 'artwork2d' | 'document' }
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
  const [guideBoxHeight, setGuideBoxHeight] = useState(80)
  const [ghostUrl, setGhostUrl] = useState<string | null>(null)

  // ── relief180 6-frame state ───────────────────────────────────────────────
  const [reliefFrames, setReliefFrames] = useState<(Blob | null)[]>(() => Array(6).fill(null))
  const [reliefStep, setReliefStep] = useState(0)
  const [lightingMode, setLightingMode] = useState<'natural' | 'torch'>('natural')
  const [torchActive, setTorchActive] = useState(false)
  const [torchUnsupported, setTorchUnsupported] = useState(false)
  const [baseSilhouetteUrl, setBaseSilhouetteUrl] = useState<string | null>(null)

  // ── Level indicator for 2D mode ───────────────────────────────────────────
  const [levelBeta, setLevelBeta] = useState(30)
  const [levelGamma, setLevelGamma] = useState(20)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunks = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const capturedFramesRef = useRef<(Blob | null)[]>(Array(8).fill(null))
  const ghostUrlRef = useRef<string | null>(null)
  const reliefFramesRef = useRef<(Blob | null)[]>(Array(6).fill(null))

  // Callback ref: attaches the stream the instant the <video> element mounts (or remounts)
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el
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

  const accent = is2D      ? 'rgb(196 181 253)'
               : isDocument ? 'rgb(125 211 252)'
               : isRelief   ? 'rgb(251 146 60)'
               :               'rgb(251 191 36)'

  const pointColor = is2D      ? 'rgb(196 181 253)'
                   : isDocument ? 'rgb(125 211 252)'
                   : isRelief   ? 'rgb(251 146 60)'
                   :               'rgb(110 231 183)'

  // Unified ghost URL: previous scan3d frame OR relief base silhouette
  const ghostSilhouetteUrl: string | null = isScan3d
    ? (currentStep > 0 ? ghostUrl : null)
    : (isRelief && reliefStep > 0 ? baseSilhouetteUrl : null)

  const isLevel = is2D && Math.abs(levelBeta) < 8 && Math.abs(levelGamma) < 8
  const bubbleX = Math.max(-11, Math.min(11, (levelGamma / 30) * 11))
  const bubbleY = Math.max(-11, Math.min(11, (levelBeta  / 30) * 11))

  // ── Camera init ───────────────────────────────────────────────────────────
  const initCamera = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable')
      return
    }
    setCameraStatus('requesting')
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(s => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = s
        if (videoRef.current) videoRef.current.srcObject = s
        setCameraStatus('active')
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

  // Reset all transient state when mode changes
  useEffect(() => {
    if (isRecording) {
      clearInterval(recordingTimerRef.current)
      mediaRecorderRef.current?.stop()
    }
    setDocPages([])
    setDocOverlay(false)

    // Reset scan3d
    const freshFrames = Array(8).fill(null) as (Blob | null)[]
    capturedFramesRef.current = freshFrames
    setCapturedFrames(freshFrames)
    setCurrentStep(0)
    setIsOrbitMode(false)
    setGuideBoxWidth(65)
    setGuideBoxHeight(80)
    if (ghostUrlRef.current) { URL.revokeObjectURL(ghostUrlRef.current); ghostUrlRef.current = null }
    setGhostUrl(null)

    // Reset relief + disable torch (any lingering torch from the previous mode)
    const freshRelief = Array(6).fill(null) as (Blob | null)[]
    reliefFramesRef.current = freshRelief
    setReliefFrames(freshRelief)
    setReliefStep(0)
    setLightingMode('natural')
    setTorchActive(false)
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
      .then(() => setTorchActive(enable))
      .catch(() => {
        if (enable) setTorchUnsupported(true)
        setTorchActive(false)
      })
  }, [lightingMode, isRelief, cameraReady])

  // Orbit dot animation for relief idle SVG overlay
  useEffect(() => {
    let rafId: number, last = 0
    const step = (t: number) => {
      if (t - last > 14) { setOrbitAngle(a => (a + 0.9) % 360); last = t }
      rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Device orientation for 2D level indicator
  useEffect(() => {
    if (!is2D) { setLevelBeta(30); setLevelGamma(20); return }
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

  // Create/revoke object URL for BASE silhouette overlay (relief steps 1–5)
  useEffect(() => {
    if (!isRelief || reliefStep < 1) { setBaseSilhouetteUrl(null); return }
    const blob = reliefFrames[0]
    if (!blob) { setBaseSilhouetteUrl(null); return }
    const url = URL.createObjectURL(blob)
    setBaseSilhouetteUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [isRelief, reliefStep, reliefFrames])

  // ── Image capture (artwork2d) → enters crop state ────────────────────────
  const captureImage = useCallback(() => {
    if (isCapturing || cropState) return
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    setIsCapturing(true)
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) { setIsCapturing(false); return }
      const objectUrl = URL.createObjectURL(blob)
      setCropCorners({ tl: { x: 8, y: 8 }, tr: { x: 92, y: 8 }, bl: { x: 8, y: 92 }, br: { x: 92, y: 92 } })
      setCropState({ blob, objectUrl, pendingMode: 'artwork2d' })
      setIsCapturing(false)
    }, 'image/jpeg', 0.92)
  }, [isCapturing, cropState])

  // ── Document page capture → enters crop state ─────────────────────────────
  const captureDocPage = useCallback(() => {
    if (isCapturing || docOverlay || cropState) return
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    setIsCapturing(true)
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) { setIsCapturing(false); return }
      const objectUrl = URL.createObjectURL(blob)
      setCropCorners({ tl: { x: 8, y: 8 }, tr: { x: 92, y: 8 }, bl: { x: 8, y: 92 }, br: { x: 92, y: 92 } })
      setCropState({ blob, objectUrl, pendingMode: 'document' })
      setIsCapturing(false)
    }, 'image/jpeg', 0.92)
  }, [isCapturing, docOverlay, cropState])

  const finishDocument = useCallback(() => {
    const allPages = docPages
    if (!allPages.length) return
    const primaryBlob = allPages[0]
    const url = URL.createObjectURL(primaryBlob)
    setDocPages([])
    setDocOverlay(false)
    onCapture({ blob: primaryBlob, url, mediaType: 'image', pages: allPages })
  }, [docPages, onCapture])

  const dismissDocOverlay = useCallback(() => {
    setScanProgress(0)
    setDocOverlay(false)
  }, [])

  // ── scan3d: capture one still frame ──────────────────────────────────────
  const captureFrame3D = useCallback(() => {
    if (isCapturing || currentStep >= 8) return
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    setIsCapturing(true)
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d')?.drawImage(video, 0, 0)
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
  }, [isCapturing, currentStep])

  const compileScan3D = useCallback(() => {
    const frames = capturedFramesRef.current.filter((b): b is Blob => b !== null)
    if (frames.length < 8) return
    const primaryBlob = frames[0]
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
    setGuideBoxHeight(80)
    setIsOrbitMode(orbit)
  }, [isOrbitMode, currentStep])

  // ── relief180: capture one still frame ───────────────────────────────────
  const captureReliefFrame = useCallback(() => {
    if (isCapturing || reliefStep >= 6) return
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    setIsCapturing(true)
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d')?.drawImage(video, 0, 0)
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
  }, [isCapturing, reliefStep])

  const compileRelief = useCallback(() => {
    const frames = reliefFramesRef.current.filter((b): b is Blob => b !== null)
    if (frames.length < 6) return
    // Disable torch before handing off
    const track = streamRef.current?.getVideoTracks()[0]
    if (track) {
      track.applyConstraints({ advanced: [{ torch: false } as unknown as MediaTrackConstraintSet] }).catch(() => {})
    }
    setTorchActive(false)
    const primaryBlob = frames[3]  // center (Top-Down) frame as primary thumbnail (index 3 of 6)
    const url = URL.createObjectURL(primaryBlob)
    onCapture({ blob: primaryBlob, url, mediaType: 'image', reliefFrames: frames })
  }, [onCapture])

  // ── Crop confirmation ─────────────────────────────────────────────────────
  const confirmCrop = useCallback(() => {
    if (!cropState || !cropContainerRef.current) return
    const container = cropContainerRef.current
    const containerW = container.clientWidth
    const containerH = container.clientHeight
    const { objectUrl, pendingMode } = cropState

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
        if (pendingMode === 'document') {
          setDocPages(prev => [...prev, croppedBlob])
          setDocOverlay(true)
        } else {
          const url = URL.createObjectURL(croppedBlob)
          onCapture({ blob: croppedBlob, url, mediaType: 'image' })
        }
      }, 'image/jpeg', 0.92)
    }
    img.src = objectUrl
  }, [cropState, cropCorners, onCapture])

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
    else if (isDocument) { if (!docOverlay && !isCapturing) captureDocPage() }
    else                 captureImage()
  }, [cropState, isScan3d, captureFrame3D, isRelief, captureReliefFrame, isDocument, docOverlay, isCapturing, captureDocPage, captureImage])

  // ── SVG calculations (flat/2D modes) ─────────────────────────────────────
  const ringOffset = RING_CIRC * (1 - scanProgress / 100)

  // Relief arc overlay: idle oscillating dot (kept for non-step overlay visual)
  const reliefNorm     = orbitAngle % 360
  const reliefOsc      = reliefNorm <= 180 ? reliefNorm : 360 - reliefNorm
  const reliefIdleRad  = Math.PI * (1 - reliefOsc / 180)
  const reliefIdleDotX = ORBIT_CX + ORBIT_RX * Math.cos(reliefIdleRad)
  const reliefIdleDotY = ORBIT_CY - ORBIT_RY * Math.sin(reliefIdleRad)

  // ── UI text ───────────────────────────────────────────────────────────────
  const hudLabel = is2D ? 'ALIGN ARTWORK' : isDocument ? 'ALIGN DOCUMENT' : isRelief ? 'ALIGN RELIEF' : 'ALIGN OBJECT'

  const tipText = docOverlay
    ? ''
    : isDocument && docPages.length > 0
    ? `Page ${docPages.length} saved — tap shutter to add another`
    : isCapturing
    ? is2D ? 'Hold steady — capturing every brushstroke and texture' : 'Hold steady — scanning'
    : is2D       ? 'Lay artwork flat · Level indicator turns green when steady'
    : isDocument ? 'Place each page flat within the frame, then press shutter'
    :               ''

  const scanLabel = isDocument ? 'CAPTURING' : isFlat ? 'CAPTURING' : 'SCANNING'

  const accentBtn = is2D
    ? { idle: 'bg-violet-400 hover:bg-violet-300', active: 'bg-violet-500' }
    : isDocument
    ? { idle: 'bg-sky-400 hover:bg-sky-300',      active: 'bg-sky-500' }
    : { idle: 'bg-orange-400 hover:bg-orange-300', active: 'bg-orange-500' }

  const accentTailwind = is2D ? 'bg-violet-500 hover:bg-violet-400'
    : isDocument ? 'bg-sky-500 hover:bg-sky-400'
    : isRelief   ? 'bg-orange-500 hover:bg-orange-400'
    :               'bg-amber-500 hover:bg-amber-400'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-2 flex-shrink-0">
        <button onClick={onClose} className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${cameraReady ? 'animate-pulse' : 'opacity-40'} ${
            is2D ? 'bg-violet-400' : isDocument ? 'bg-sky-400' : isRelief ? 'bg-orange-400' : 'bg-amber-400'
          }`} />
          <span className="text-white/75 text-xs font-mono tracking-[0.15em] uppercase">
            {cameraStatus === 'requesting'  ? 'Connecting…'
           : cameraStatus === 'denied'      ? 'Access Denied'
           : cameraStatus === 'unavailable' ? 'No Camera'
           : cameraStatus === 'error'       ? 'Camera Error'
           : is2D ? 'Vision AI Active' : isDocument ? 'OCR Engine Active' : isRelief ? 'Depth Sensor Active' : 'LiDAR Active'}
          </span>
        </div>
        <div className="w-9 h-9 flex items-center justify-center">
          {isRelief && torchActive && (
            <Zap className="w-4 h-4 text-orange-400 animate-pulse" aria-label="Torch active" />
          )}
          {isRelief && !torchActive && (
            <Lightbulb className="w-4 h-4 text-white/25" />
          )}
          {!isRelief && (
            <Lightbulb className="w-5 h-5 text-white/40" />
          )}
        </div>
      </div>

      {/* Mode switcher */}
      <div className="flex justify-center px-5 pb-3 flex-shrink-0">
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
      <div className="flex-1 relative overflow-hidden min-h-0">
        <div ref={cropContainerRef} className="absolute inset-0 overflow-hidden">

        {/* Live camera feed — hidden (not stopped) while cropping so retake works */}
        <video
          ref={setVideoRef}
          className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${isFlat ? 'object-contain' : 'object-cover'} ${
            cropState ? 'opacity-0' : cameraReady ? 'opacity-100' : 'opacity-0'
          }`}
          autoPlay playsInline muted
        />

        {/* Crop mode: show captured still + draggable crop overlay */}
        {cropState && (
          <>
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
          </>
        )}

        {/* Ghost / onion-skin: previous scan3d frame or relief base silhouette, clipped to guide box */}
        {ghostSilhouetteUrl && (
          <img src={ghostSilhouetteUrl} alt="" aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              opacity: 0.25,
              clipPath: `inset(${(100 - guideBoxHeight) / 2}% ${(100 - guideBoxWidth) / 2}%)`,
            }}
          />
        )}

        {/* Universal guide box — 3D (both sub-modes) and Relief */}
        {(isScan3d || isRelief) && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <div
              className={`relative border-2 border-dashed ${isRelief ? 'border-orange-400/55' : 'border-white/55'}`}
              style={{
                width: `${guideBoxWidth}%`,
                height: `${guideBoxHeight}%`,
                transition: (isScan3d ? currentStep === 0 : reliefStep === 0)
                  ? 'width 50ms linear, height 50ms linear'
                  : 'none',
              }}
            >
              {/* Crosshair */}
              <div className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 ${isRelief ? 'bg-orange-400/20' : 'bg-white/20'}`} />
              <div className={`absolute inset-x-0 top-1/2 h-px -translate-y-1/2 ${isRelief ? 'bg-orange-400/20' : 'bg-white/20'}`} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-3.5 h-3.5 rounded-full border-2 ${isRelief ? 'border-orange-400/55' : 'border-white/55'}`} />
              </div>
              {/* Corner accents */}
              {(['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
                'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'] as const)
                .map((cls, i) => (
                  <div key={i} className={`absolute w-4 h-4 ${isRelief ? 'border-orange-400/80' : 'border-white/80'} ${cls}`} />
                ))}
              {/* Lock badge — appears after baseline captured */}
              {(isScan3d ? currentStep > 0 : reliefStep > 0) && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className={`text-[9px] font-mono tracking-[0.12em] ${isRelief ? 'text-orange-400/50' : 'text-white/50'}`}>BOX LOCKED</span>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Dark fallback */}
        {!cameraReady && (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 38%, #3f3f46 0%, #27272a 45%, #09090b 100%)' }} />
        )}

        {/* Loading spinner */}
        {cameraStatus === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-10 h-10 rounded-full border-4 border-zinc-700 border-t-white/60 animate-spin" />
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

        {/* ── SVG scanning overlay ── */}
        {!cropState && (cameraReady || cameraStatus === 'requesting') && (
          <svg viewBox="0 0 300 440" className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Feature point cloud */}
            {([
              [98,128,0.40],[158,108,0.50],[208,136,0.30],
              [84,190,0.35],[186,168,0.45],[228,196,0.30],
              [106,248,0.40],[172,256,0.35],[202,228,0.50],
              [124,206,0.30],[152,150,0.45],[190,210,0.40],
              [118,170,0.30],[238,162,0.35],[70,218,0.40],
              [144,130,0.28],[220,240,0.38],[92,155,0.42],
            ] as [number,number,number][]).map(([x,y,o],i) => (
              <circle key={i} cx={x} cy={y} r="1.8" fill={pointColor} opacity={o} />
            ))}

            {/* Alignment frame */}
            <rect x="58" y="72" width="184" height="236"
              fill="none" stroke="white" strokeWidth="0.7" strokeOpacity="0.22" strokeDasharray="6 4" />

            {/* Base mesh grid */}
            <g opacity="0.09" stroke="white" strokeWidth="0.5">
              {[90,120,150,180,210].map(x => <line key={x} x1={x} y1="72" x2={x} y2="308" />)}
              {[108,148,188,228,268].map(y => <line key={y} x1="58" y1={y} x2="242" y2={y} />)}
            </g>

            {/* 2D Masterpiece: rule-of-thirds grid */}
            {is2D && (
              <g>
                <g stroke={accent} strokeWidth="0.7" opacity="0.22">
                  <line x1="119" y1="72" x2="119" y2="308" />
                  <line x1="181" y1="72" x2="181" y2="308" />
                  <line x1="58"  y1="151" x2="242" y2="151" />
                  <line x1="58"  y1="229" x2="242" y2="229" />
                </g>
                <g stroke={accent} strokeWidth="0.8" opacity="0.40">
                  <line x1="145" y1="190" x2="155" y2="190" />
                  <line x1="150" y1="185" x2="150" y2="195" />
                </g>
              </g>
            )}

            {/* 360°: Wireframe sphere dome */}
            {isScan3d && (
              <g>
                <circle cx="150" cy="190" r="90" fill="none" stroke={accent} strokeWidth="0.8"
                  strokeOpacity="0.30" strokeDasharray="3 2.5" />
                <ellipse cx="150" cy="190" rx="90" ry="21"   fill="none" stroke={accent} strokeWidth="0.90" strokeOpacity="0.50" />
                <ellipse cx="150" cy="145" rx="78" ry="18"   fill="none" stroke={accent} strokeWidth="0.75" strokeOpacity="0.42" />
                <ellipse cx="150" cy="112" rx="45" ry="10.5" fill="none" stroke={accent} strokeWidth="0.65" strokeOpacity="0.35" />
                <ellipse cx="150" cy="102" rx="16" ry="3.8"  fill="none" stroke={accent} strokeWidth="0.50" strokeOpacity="0.28" />
                <ellipse cx="150" cy="235" rx="78" ry="18"   fill="none" stroke={accent} strokeWidth="0.75" strokeOpacity="0.38" />
                <ellipse cx="150" cy="268" rx="45" ry="10.5" fill="none" stroke={accent} strokeWidth="0.65" strokeOpacity="0.30" />
                <ellipse cx="150" cy="190" rx="31" ry="90"   fill="none" stroke={accent} strokeWidth="0.65" strokeOpacity="0.28" />
                <ellipse cx="150" cy="190" rx="69" ry="90"   fill="none" stroke={accent} strokeWidth="0.65" strokeOpacity="0.28" />
                <ellipse cx="150" cy="190" rx="88" ry="90"   fill="none" stroke={accent} strokeWidth="0.65" strokeOpacity="0.28" />
                <text x="150" y="295" fill={accent} fontSize="7" fontFamily="monospace"
                  opacity="0.55" textAnchor="middle" letterSpacing="1.2">360° SCAN VOLUME</text>
              </g>
            )}

            {/* Relief 180°: 5-position arc with per-step status dots */}
            {isRelief && (
              <g>
                {/* Static guide arc */}
                <path
                  d={`M ${ORBIT_CX - ORBIT_RX} ${ORBIT_CY} A ${ORBIT_RX} ${ORBIT_RY} 0 0 1 ${ORBIT_CX + ORBIT_RX} ${ORBIT_CY}`}
                  fill="none" stroke={accent} strokeWidth="1.2" strokeOpacity="0.28" strokeDasharray="5 4"
                />
                {/* End-stop markers */}
                <line x1={ORBIT_CX - ORBIT_RX} y1={ORBIT_CY - 14} x2={ORBIT_CX - ORBIT_RX} y2={ORBIT_CY + 14}
                  stroke={accent} strokeWidth="2" strokeOpacity="0.55" strokeLinecap="round" />
                <line x1={ORBIT_CX + ORBIT_RX} y1={ORBIT_CY - 14} x2={ORBIT_CX + ORBIT_RX} y2={ORBIT_CY + 14}
                  stroke={accent} strokeWidth="2" strokeOpacity="0.55" strokeLinecap="round" />
                <text x={ORBIT_CX} y={ORBIT_CY - ORBIT_RY - 10} fill={accent} fontSize="7.5" fontFamily="monospace"
                  opacity="0.60" letterSpacing="1" textAnchor="middle">180° ARC</text>

                {/* 5 arc position dots (mapped to frames[1]–frames[5]) */}
                {RELIEF_ARC_ANGLES.map((angle, i) => {
                  const rad = angle * Math.PI / 180
                  const x = ORBIT_CX + ORBIT_RX * Math.sin(rad)
                  const y = ORBIT_CY - ORBIT_RY * Math.cos(rad)
                  const captured = reliefFrames[i + 1] !== null
                  const active   = (i + 1) === reliefStep && !allReliefCaptured
                  return (
                    <g key={i}>
                      <circle
                        cx={x} cy={y}
                        r={active ? 5.5 : captured ? 4.5 : 3}
                        fill={captured || active ? accent : 'rgba(255,255,255,0.35)'}
                        opacity={active ? 0.95 : captured ? 0.75 : 0.50}
                      />
                      {active && (
                        <circle cx={x} cy={y} r="9" fill="none" stroke={accent} strokeWidth="1.2" opacity="0">
                          <animate attributeName="r" values="5.5;13" dur="1.4s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.55;0" dur="1.4s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </g>
                  )
                })}

                {/* BASE step indicator: flat overhead icon */}
                {reliefStep === 0 && !allReliefCaptured && (
                  <g>
                    <rect x={ORBIT_CX - 18} y={ORBIT_CY + 18} width="36" height="22" rx="5"
                      fill={accent} fillOpacity="0.12" stroke={accent} strokeWidth="1.2" strokeOpacity="0.70" />
                    <text x={ORBIT_CX} y={ORBIT_CY + 33} textAnchor="middle"
                      fill={accent} fontSize="7.5" fontFamily="monospace" opacity="0.85">FLAT ABOVE</text>
                    <circle cx={ORBIT_CX} cy={ORBIT_CY + 18} r="4" fill={accent} opacity="0.80">
                      <animate attributeName="opacity" values="0.80;0.20;0.80" dur="1.4s" repeatCount="indefinite" />
                    </circle>
                  </g>
                )}

              </g>
            )}

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
              {isFlat ? 'FLAT · 0°' : isRelief ? `${reliefStep}/6` : isScan3d ? `${currentStep}/8` : '~0.4 m'}
            </text>

            {/* Mode-specific indicators */}
            {isFlat ? (
              <>
                <circle cx={RING_CX} cy={RING_CY} r={RING_R} fill="none" stroke="white" strokeWidth="0.8" strokeOpacity="0.16" />
                <circle cx={RING_CX} cy={RING_CY} r={RING_R} fill="none"
                  stroke={accent} strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={RING_CIRC} strokeDashoffset={ringOffset}
                  transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
                  opacity={scanProgress > 0 ? 0.9 : 0}
                  style={{ transition: 'opacity 200ms, stroke-dashoffset 60ms linear' }}
                />
                <g stroke="white" strokeWidth="0.8" strokeOpacity="0.45" fill="none">
                  <circle cx={RING_CX} cy={RING_CY} r="3.5" />
                  <line x1={RING_CX - 9} y1={RING_CY} x2={RING_CX + 9} y2={RING_CY} />
                  <line x1={RING_CX} y1={RING_CY - 9} x2={RING_CX} y2={RING_CY + 9} />
                </g>
                {isCapturing && (
                  <circle cx={RING_CX} cy={RING_CY} r={RING_R} fill="none" stroke={accent} strokeWidth="1" opacity="0.5">
                    <animate attributeName="r" values={`${RING_R};${RING_R + 22}`} dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}
              </>
            ) : (isScan3d || isRelief) ? (
              <g stroke="white" strokeWidth="0.8" strokeOpacity="0.45" fill="none">
                <circle cx="150" cy="190" r="3.5" />
                <line x1="141" y1="190" x2="159" y2="190" />
                <line x1="150" y1="181" x2="150" y2="199" />
              </g>
            ) : null}

            {/* Progress overlay (flat modes) */}
            {isCapturing && isFlat && (
              <>
                <rect x="94" y="172" width="112" height="40" rx="5" fill="black" fillOpacity="0.65" />
                <text x="150" y="187" fill={accent}
                  fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="2">
                  {scanLabel}
                </text>
                <text x="150" y="203" fill="white" fontSize="13" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  {`${Math.round(scanProgress)}%`}
                </text>
              </>
            )}
          </svg>
        )}

        {/* ── 5-column grid constrained to guide box for relief180 steps 1–5 ── */}
        {isRelief && reliefStep >= 1 && !allReliefCaptured && (
          <div
            className="absolute z-20 grid grid-cols-5 divide-x-2 divide-white/40 pointer-events-none"
            style={{
              width: `${guideBoxWidth}%`,
              height: `${guideBoxHeight}%`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {([
              { step: 1, label: 'XL', rotation: 'rotate-[-60deg]' },
              { step: 2, label: 'LC', rotation: 'rotate-[-30deg]' },
              { step: 3, label: 'TD', rotation: 'rotate-0'        },
              { step: 4, label: 'RC', rotation: 'rotate-[30deg]'  },
              { step: 5, label: 'XR', rotation: 'rotate-[60deg]'  },
            ] as const).map(({ step, label, rotation }) => {
              const isActive   = step === reliefStep
              const isCaptured = reliefFrames[step] !== null
              return (
                <div key={step} className="relative flex flex-col items-center justify-center">
                  {isActive && (
                    <div className={`w-12 h-2.5 bg-orange-400/90 rounded-full ${rotation}`} />
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
        )}

        {/* ── Document between-pages overlay ── */}
        {isDocument && docOverlay && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-sm">
            <div className="mx-5 w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800">

              <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-sky-500/15 dark:bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-sky-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-zinc-100 text-sm leading-snug">
                      Page {docPages.length} Captured
                    </p>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
                      {docPages.length === 1
                        ? 'Position the next page, or save now.'
                        : `${docPages.length} pages in this document.`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {docPages.map((_, i) => (
                    <div key={i} className="flex items-center gap-1 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 rounded-full px-2 py-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5 text-sky-500 flex-shrink-0" />
                      <span className="text-sky-700 dark:text-sky-400 text-[10px] font-semibold">p.{i + 1}</span>
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
                  className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-semibold text-sm py-3 rounded-2xl transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Capture Page {docPages.length + 1}
                </button>
                <button
                  onClick={finishDocument}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium text-sm py-3 rounded-2xl border border-slate-200 dark:border-zinc-700 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Finish & Save Document ({docPages.length} {docPages.length === 1 ? 'page' : 'pages'})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Level indicator (2D mode) ── */}
        {is2D && cameraReady && (
          <div className="absolute top-4 right-4 z-20 flex flex-col items-center gap-1">
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
        )}

        {/* HUD: compass dial for scan3d — floats over the bottom of the camera feed */}
        {isScan3d && !cropState && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-black/40 backdrop-blur-md rounded-full p-2">
              <CompassDial capturedFrames={capturedFrames} currentStep={currentStep} svgClassName="w-32 h-32" isOrbitMode={isOrbitMode} />
            </div>
          </div>
        )}

        {/* HUD: cross-section arc for relief180 — floats over the bottom of the camera feed */}
        {isRelief && !cropState && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-black/50 backdrop-blur-md rounded-2xl px-3 py-2">
              <ReliefCrossSectionHUD capturedFrames={reliefFrames} currentStep={reliefStep} />
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ── Tip text (flat modes only, hidden during crop) ── */}
      {isFlat && !cropState && (
        <div className="flex-shrink-0 px-6 py-2">
          <p className="text-center text-white/38 text-xs leading-relaxed tracking-wide">{tipText}</p>
        </div>
      )}

      {/* ── Crop confirmation controls ── */}
      {cropState ? (
        <div className="flex-shrink-0 flex flex-col items-center gap-3 px-5 pb-6 pt-3">
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
        <div className="flex-shrink-0 flex flex-col items-center gap-3 px-5 pb-6 pt-3">

          {/* Rotate / Orbit toggle — mirrors the Relief lighting toggle */}
          <div className="flex items-center gap-2.5 w-full bg-white/6 rounded-2xl px-4 py-2.5 border border-white/8">
            <Box className={`w-4 h-4 flex-shrink-0 transition-colors ${!isOrbitMode ? 'text-amber-400' : 'text-white/30'}`} />
            <span className="text-white/50 text-xs flex-1 font-medium">3D Mode</span>
            <div className="flex gap-0.5 bg-white/8 rounded-full p-0.5">
              <button
                onClick={() => handleOrbitToggle(false)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  !isOrbitMode ? 'bg-white/20 text-white shadow-sm' : 'text-white/35 hover:text-white/60'
                }`}
              >
                Rotate
              </button>
              <button
                onClick={() => handleOrbitToggle(true)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  isOrbitMode
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
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

          {/* Width + Height sliders — step 0 (baseline) for ALL 3D sub-modes */}
          {currentStep === 0 && !allFramesCaptured && (
            <div className="w-full space-y-3 px-1">
              {/* Width slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/45 text-[10px] font-mono tracking-wider">WIDTH</span>
                  <span className="text-amber-400/75 text-[10px] font-mono tabular-nums">{guideBoxWidth}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  step="1"
                  value={guideBoxWidth}
                  onChange={e => setGuideBoxWidth(Number(e.target.value))}
                  className="w-full h-2 rounded-full accent-amber-400 cursor-pointer touch-manipulation"
                  aria-label="Guide box width"
                />
              </div>
              {/* Height slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/45 text-[10px] font-mono tracking-wider">HEIGHT</span>
                  <span className="text-amber-400/75 text-[10px] font-mono tabular-nums">{guideBoxHeight}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  step="1"
                  value={guideBoxHeight}
                  onChange={e => setGuideBoxHeight(Number(e.target.value))}
                  className="w-full h-2 rounded-full accent-amber-400 cursor-pointer touch-manipulation"
                  aria-label="Guide box height"
                />
              </div>
            </div>
          )}

          {/* Step heading + contextual helper text */}
          <div className="text-center px-3">
            <p className="text-white/90 font-semibold text-sm leading-tight">
              {allFramesCaptured
                ? 'All 8 frames captured!'
                : (isOrbitMode ? ORBIT_STEPS : SCAN_STEPS)[currentStep]?.heading}
            </p>
            <p className="text-white/40 text-xs mt-0.5 leading-relaxed">
              {allFramesCaptured
                ? 'Tap below to compile your 3D object'
                : currentStep === 0
                ? 'Use sliders to frame your subject, then capture the baseline.'
                : isOrbitMode
                ? 'Box locked. Step right and fit subject back inside frame.'
                : (SCAN_STEPS[currentStep]?.sub ?? '')}
            </p>
          </div>

          {/* Compile CTA or shutter */}
          {allFramesCaptured ? (
            <button
              onClick={compileScan3D}
              className="w-full flex items-center justify-center gap-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold text-sm py-3.5 rounded-2xl transition-colors shadow-lg shadow-amber-500/20"
            >
              <Box className="w-5 h-5" />
              Compile &amp; Save 3D Object
            </button>
          ) : (
            <button
              onClick={handleShutter}
              disabled={!cameraReady || isCapturing}
              className="relative w-20 h-20 rounded-full border-4 border-white/28 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
              aria-label="Capture scan frame"
            >
              <div className={`w-14 h-14 rounded-full transition-colors duration-150 ${
                isCapturing ? 'bg-amber-500' : 'bg-amber-400 hover:bg-amber-300'
              }`} />
              {isCapturing && (
                <div className="absolute inset-0 rounded-full border-4 border-amber-400 animate-ping opacity-20" />
              )}
            </button>
          )}
        </div>

      ) : isRelief ? (
        /* ── relief180: controls ── */
        <div className="flex-shrink-0 flex flex-col items-center gap-3 px-5 pb-6 pt-3">

          {/* Lighting toggle */}
          <div className="flex items-center gap-2.5 w-full bg-white/6 rounded-2xl px-4 py-2.5 border border-white/8">
            <Lightbulb className={`w-4 h-4 flex-shrink-0 transition-colors ${lightingMode === 'torch' ? 'text-orange-400' : 'text-white/35'}`} />
            <span className="text-white/50 text-xs flex-1 font-medium">Lighting</span>
            <div className="flex gap-0.5 bg-white/8 rounded-full p-0.5">
              <button
                onClick={() => setLightingMode('natural')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  lightingMode === 'natural'
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/35 hover:text-white/60'
                }`}
              >
                Natural
              </button>
              <button
                onClick={() => setLightingMode('torch')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  lightingMode === 'torch'
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                    : 'text-white/35 hover:text-white/60'
                }`}
              >
                <Zap className="w-2.5 h-2.5" />
                Flashlight
              </button>
            </div>
            {torchUnsupported && (
              <span className="text-[9px] text-orange-400/65 whitespace-nowrap">unsupported</span>
            )}
          </div>

          {/* Width + Height sliders — relief baseline step only */}
          {reliefStep === 0 && !allReliefCaptured && (
            <div className="w-full space-y-3 px-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/45 text-[10px] font-mono tracking-wider">WIDTH</span>
                  <span className="text-orange-400/75 text-[10px] font-mono tabular-nums">{guideBoxWidth}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  step="1"
                  value={guideBoxWidth}
                  onChange={e => setGuideBoxWidth(Number(e.target.value))}
                  className="w-full h-2 rounded-full accent-orange-400 cursor-pointer touch-manipulation"
                  aria-label="Guide box width"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/45 text-[10px] font-mono tracking-wider">HEIGHT</span>
                  <span className="text-orange-400/75 text-[10px] font-mono tabular-nums">{guideBoxHeight}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  step="1"
                  value={guideBoxHeight}
                  onChange={e => setGuideBoxHeight(Number(e.target.value))}
                  className="w-full h-2 rounded-full accent-orange-400 cursor-pointer touch-manipulation"
                  aria-label="Guide box height"
                />
              </div>
            </div>
          )}

          {/* Step guidance */}
          <div className="text-center px-3">
            <p className="text-white/90 font-semibold text-sm leading-tight">
              {allReliefCaptured ? 'All 6 frames captured!' : RELIEF_STEPS[reliefStep]?.heading}
            </p>
            <p className="text-white/40 text-xs mt-0.5 leading-relaxed">
              {allReliefCaptured
                ? 'Tap below to finish and save your Relief'
                : reliefStep === 0
                ? 'Use sliders to frame your subject, then capture the base texture.'
                : RELIEF_STEPS[reliefStep]?.sub}
            </p>
          </div>

          {/* Compile CTA or shutter */}
          {allReliefCaptured ? (
            <button
              onClick={compileRelief}
              className="w-full flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-sm py-3.5 rounded-2xl transition-colors shadow-lg shadow-orange-500/20"
            >
              <Mountain className="w-5 h-5" />
              Finish &amp; Save Relief
            </button>
          ) : (
            <button
              onClick={handleShutter}
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
          )}
        </div>

      ) : (
        /* ── Standard bottom controls (artwork2d, document) ── */
        <div className="flex-shrink-0 flex items-center justify-around px-10 pb-14 pt-2">

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isCapturing || docOverlay}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/55 hover:text-white transition-colors disabled:opacity-40"
            aria-label="Upload from gallery"
          >
            <Images className="w-5 h-5" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

          <button
            onClick={handleShutter}
            disabled={!cameraReady || isCapturing || (isDocument && docOverlay)}
            className="relative w-20 h-20 rounded-full border-4 border-white/28 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
            aria-label={isDocument ? 'Capture page' : 'Take photo'}
          >
            <div className={`w-14 h-14 rounded-full transition-colors duration-150 ${
              isCapturing ? accentBtn.active : accentBtn.idle
            }`} />
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
      )}
    </div>
  )
}

