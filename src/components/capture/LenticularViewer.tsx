'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ArrowLeftRight, AlertTriangle, ImageOff } from 'lucide-react'

const PIXELS_PER_FRAME = 32
const POSITIONS = ['XL', 'L', 'TD', 'R', 'XR']
const ANGLE_LABELS = ['-80°', '-40°', '0°', '+40°', '+80°']

// Positive drag/scroll/key input should visually shift the light the same way
// ThreeViewer's OrbitControls rotates the object — the underlying frame index
// moves opposite to a rightward pixel delta, hence -1 here (same convention as
// SpinSequenceViewer.tsx).
const DIRECTION_SIGN = -1

// Momentum tuning — velocity is tracked in frames/ms, same feel as SpinSequenceViewer.
const FRICTION = 0.92
const MIN_FLICK_VELOCITY = 0.03
const STOP_VELOCITY = 0.002

// Auto-spin teaser — a single subtle nudge, not a sweep across the whole arc.
const TEASER_DURATION_MS = 700

function clampFrame(i: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(total - 1, i))
}

type FrameStatus = 'pending' | 'loaded' | 'error'

interface Props {
  imageUrls: string[]
  // No edit/delete/align controls exist in this viewer, but public callers (e.g.
  // the shared/[shareId] page) pass this explicitly to document the lockdown intent.
  readOnly?: boolean
}

export default function LenticularViewer({ imageUrls }: Props) {
  // Frame 0 is the flat BASE/albedo shot — exclude it from the lenticular scrub
  const scrubUrls = imageUrls.slice(1)
  const totalFrames = scrubUrls.length
  const centerIndex = Math.floor(totalFrames / 2)

  const [frameIndex, setFrameIndex] = useState(centerIndex)
  const [isDragging, setIsDragging] = useState(false)
  const [hintDismissed, setHintDismissed] = useState(false)
  const [frameStatuses, setFrameStatuses] = useState<FrameStatus[]>(() => scrubUrls.map(() => 'pending'))

  const dragStartX = useRef(0)
  const dragStartFrame = useRef(centerIndex)

  // Continuous (float) position — lets momentum sweep smoothly through frame
  // boundaries and clamp precisely at the arc's ends instead of snapping.
  const positionRef = useRef(centerIndex)
  const velocityRef = useRef(0) // frames / ms
  const lastMoveTimeRef = useRef(0)
  const lastMoveXRef = useRef(0)
  const animFrameRef = useRef<number | null>(null)
  const autoSpinPlayedRef = useRef(false)

  const settledCount = frameStatuses.filter(s => s !== 'pending').length
  const allSettled = totalFrames > 0 && settledCount >= totalFrames
  const failedIndices = frameStatuses.reduce<number[]>((acc, s, i) => { if (s === 'error') acc.push(i); return acc }, [])
  const hasErrors = failedIndices.length > 0

  const cancelAnimation = useCallback(() => {
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [])

  // Preload the 5 arc frames (success/failure tracked per-index) so scrubbing is
  // instant and a broken frame renders a clean placeholder instead of a raw broken <img>.
  useEffect(() => {
    const frames = imageUrls.slice(1)
    if (!frames.length) return
    let cancelled = false
    cancelAnimation()
    const startCenter = Math.floor(frames.length / 2)
    positionRef.current = startCenter
    velocityRef.current = 0
    autoSpinPlayedRef.current = false
    setFrameIndex(startCenter)
    setFrameStatuses(frames.map(() => 'pending'))
    frames.forEach((url, i) => {
      const img = new Image()
      img.onload = () => {
        if (cancelled) return
        setFrameStatuses(prev => { const next = [...prev]; next[i] = 'loaded'; return next })
      }
      img.onerror = () => {
        if (cancelled) return
        setFrameStatuses(prev => { const next = [...prev]; next[i] = 'error'; return next })
      }
      img.src = url
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrls])

  // Subtle lighting tease once settled — nudges one step toward an edge and back,
  // clamped within the arc; halts instantly on real user touch via cancelAnimation().
  useEffect(() => {
    if (!allSettled || autoSpinPlayedRef.current || hintDismissed || totalFrames < 2) return
    autoSpinPlayedRef.current = true
    const teaserOffset = Math.min(1, totalFrames - 1 - centerIndex, centerIndex)
    if (teaserOffset <= 0) return
    const startTs = performance.now()

    const step = (ts: number) => {
      const t = Math.min((ts - startTs) / TEASER_DURATION_MS, 1)
      const eased = Math.sin(t * Math.PI) // 0 → peak at t=0.5 → back to 0
      const pos = clampFrame(centerIndex + teaserOffset * eased, totalFrames)
      positionRef.current = pos
      setFrameIndex(Math.round(pos))
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step)
      } else {
        animFrameRef.current = null
        positionRef.current = centerIndex
        setFrameIndex(centerIndex)
      }
    }
    animFrameRef.current = requestAnimationFrame(step)
    return cancelAnimation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSettled, totalFrames, hintDismissed, centerIndex])

  const dismiss = useCallback(() => setHintDismissed(true), [])

  // Momentum coast — decays velocity each tick (friction normalized to real elapsed
  // time) and sweeps positionRef until it either decays below STOP_VELOCITY or hits
  // the arc's edge, at which point it stops cleanly (no wrap, no bounce).
  const startMomentum = useCallback(() => {
    let lastTs: number | null = null
    const step = (ts: number) => {
      const dt = lastTs == null ? 16 : ts - lastTs
      lastTs = ts
      velocityRef.current *= Math.pow(FRICTION, dt / 16)
      const next = positionRef.current + velocityRef.current * dt
      const clamped = clampFrame(next, totalFrames)
      positionRef.current = clamped
      setFrameIndex(Math.round(clamped))
      if (clamped !== next || Math.abs(velocityRef.current) < STOP_VELOCITY) {
        animFrameRef.current = null
        return
      }
      animFrameRef.current = requestAnimationFrame(step)
    }
    animFrameRef.current = requestAnimationFrame(step)
  }, [totalFrames])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    cancelAnimation() // kills any in-flight momentum coast or lighting tease
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartX.current = e.clientX
    dragStartFrame.current = frameIndex
    positionRef.current = frameIndex
    velocityRef.current = 0
    lastMoveTimeRef.current = performance.now()
    lastMoveXRef.current = e.clientX
    setIsDragging(true)
    setHintDismissed(true)
  }, [frameIndex, cancelAnimation])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !totalFrames) return
    const now = performance.now()
    const delta = e.clientX - dragStartX.current
    const rawPosition = dragStartFrame.current + DIRECTION_SIGN * delta / PIXELS_PER_FRAME
    const clamped = clampFrame(rawPosition, totalFrames)
    positionRef.current = clamped
    setFrameIndex(Math.round(clamped))

    // Instantaneous velocity from this move alone, so a slow drag that ends in a
    // sharp flick reflects only the flick — not an average over the whole drag.
    const dt = now - lastMoveTimeRef.current
    if (dt > 0) {
      velocityRef.current = DIRECTION_SIGN * (e.clientX - lastMoveXRef.current) / PIXELS_PER_FRAME / dt
    }
    lastMoveTimeRef.current = now
    lastMoveXRef.current = e.clientX
  }, [isDragging, totalFrames])

  const onPointerUp = useCallback(() => {
    setIsDragging(false)
    if (totalFrames && Math.abs(velocityRef.current) > MIN_FLICK_VELOCITY) {
      startMomentum()
    }
  }, [totalFrames, startMomentum])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    cancelAnimation()
    const rawDir = e.deltaX !== 0 ? (e.deltaX > 0 ? 1 : -1) : (e.deltaY > 0 ? 1 : -1)
    const dir = DIRECTION_SIGN * rawDir
    positionRef.current = clampFrame(frameIndex + dir, totalFrames)
    setFrameIndex(prev => clampFrame(prev + dir, totalFrames))
    dismiss()
  }, [totalFrames, dismiss, cancelAnimation, frameIndex])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      cancelAnimation()
      setFrameIndex(prev => clampFrame(prev - DIRECTION_SIGN, totalFrames))
      dismiss()
    } else if (e.key === 'ArrowRight') {
      cancelAnimation()
      setFrameIndex(prev => clampFrame(prev + DIRECTION_SIGN, totalFrames))
      dismiss()
    }
  }, [totalFrames, dismiss, cancelAnimation])

  const positionLabel = POSITIONS[frameIndex] ?? ''
  const angleLabel    = ANGLE_LABELS[frameIndex] ?? ''

  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      tabIndex={0}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        outline: 'none',
      }}
    >
      {/* Ambient orange glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 55% at 50% 65%, rgba(251,146,60,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Frame stack — only the active frame is visible. A frame that failed to
           load renders a placeholder tile instead of a raw broken <img>. */}
      {scrubUrls.map((url, i) => (
        frameStatuses[i] === 'error' ? (
          <div
            key={i}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-900"
            style={{ opacity: i === frameIndex ? 1 : 0 }}
          >
            <ImageOff className="w-8 h-8 text-zinc-600" />
            <span className="text-zinc-600 text-[10px] font-mono">{POSITIONS[i] ?? `Frame ${i + 1}`} unavailable</span>
          </div>
        ) : (
          <img
            key={i}
            src={url}
            alt=""
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              opacity: i === frameIndex ? 1 : 0,
              pointerEvents: 'none',
              willChange: 'opacity',
              transform: 'translateZ(0)',
              transition: 'none',
            }}
            draggable={false}
          />
        )
      ))}

      {/* Loading overlay — waits for every frame to settle (load OR error), not just load */}
      {!allSettled && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90">
          <div className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-orange-400 animate-spin mb-4" />
          <p className="text-white/40 text-xs font-mono tracking-widest">
            {settledCount} / {totalFrames} frames
          </p>
        </div>
      )}

      {/* Error banner — persists whenever one or more frames failed to load */}
      {allSettled && hasErrors && (
        <div className="absolute top-4 inset-x-0 flex justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-red-950/70 backdrop-blur-sm border border-red-500/30 rounded-full px-3.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-[11px] font-medium">
              {failedIndices.length} of {totalFrames} frame{failedIndices.length === 1 ? '' : 's'} failed to load
            </span>
          </div>
        </div>
      )}

      {/* Drag hint — shown until first interaction */}
      {allSettled && !hintDismissed && (
        <div className="absolute inset-x-0 bottom-20 flex justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-black/55 backdrop-blur-sm border border-white/10 rounded-full px-3.5 py-1.5 animate-pulse">
            <ArrowLeftRight className="w-3.5 h-3.5 text-orange-400/60" />
            <span className="text-white/50 text-[11px] font-medium tracking-wide">
              Drag to shift light &amp; feel the depth
            </span>
          </div>
        </div>
      )}

      {/* HUD — position dots + label */}
      {allSettled && (
        <div className="absolute bottom-5 inset-x-0 flex justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-3 bg-black/55 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2.5">
            {/* 5 dots indicating the arc position */}
            <div className="flex items-center gap-1.5">
              {scrubUrls.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-150 ${
                    i === frameIndex
                      ? 'w-2.5 h-2.5 bg-orange-400'
                      : 'w-1.5 h-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
            <div className="w-px h-4 bg-white/15 flex-shrink-0" />
            {/* Position name */}
            <span className="text-orange-400/80 text-[10px] font-mono font-bold w-6 text-center tracking-wider">
              {positionLabel}
            </span>
            <div className="w-px h-4 bg-white/15 flex-shrink-0" />
            {/* Angle */}
            <span className="text-white/45 text-[10px] font-mono tabular-nums w-9 text-center">
              {angleLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
