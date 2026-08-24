'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ArrowLeftRight, AlertTriangle, ImageOff } from 'lucide-react'

const PIXELS_PER_FRAME = 28
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

// Momentum tuning — velocity is tracked in frames/ms.
const FRICTION = 0.92          // per ~16ms tick, normalized to actual elapsed time
const MIN_FLICK_VELOCITY = 0.03 // release speed below this settles immediately, no coast
const STOP_VELOCITY = 0.002     // coast ends once decayed below this

// Auto-spin teaser — a gentle nudge forward-and-back, not a full revolution.
const TEASER_DURATION_MS = 900

function wrapFrame(i: number, total: number): number {
  return ((i % total) + total) % total
}

type FrameStatus = 'pending' | 'loaded' | 'error'

interface Props {
  imageUrls: string[]
}

export default function SpinSequenceViewer({ imageUrls }: Props) {
  const totalFrames = imageUrls.length
  const [frameIndex, setFrameIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [hintDismissed, setHintDismissed] = useState(false)
  const [frameStatuses, setFrameStatuses] = useState<FrameStatus[]>(() => imageUrls.map(() => 'pending'))

  const dragStartX = useRef(0)
  const dragStartFrame = useRef(0)

  // Continuous (float) frame position — lets momentum sweep smoothly through frame
  // boundaries instead of jumping in whole-frame steps like a raw drag does.
  const positionRef = useRef(0)
  const velocityRef = useRef(0)          // frames / ms
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

  // Preload every frame (success/failure tracked per-index) so scrubbing is instant
  // and a broken frame renders a clean placeholder instead of a raw broken <img>.
  useEffect(() => {
    if (!totalFrames) return
    let cancelled = false
    cancelAnimation()
    positionRef.current = 0
    velocityRef.current = 0
    autoSpinPlayedRef.current = false
    setFrameIndex(0)
    setFrameStatuses(imageUrls.map(() => 'pending'))
    imageUrls.forEach((url, i) => {
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
  }, [imageUrls, totalFrames])

  // Brief teaser nudge once loading settles, communicating interactivity — halts
  // instantly on real user touch via cancelAnimation() in onPointerDown.
  useEffect(() => {
    if (!allSettled || autoSpinPlayedRef.current || hintDismissed || totalFrames < 2) return
    autoSpinPlayedRef.current = true
    const teaserFrames = Math.min(2, totalFrames - 1)
    const startTs = performance.now()

    const step = (ts: number) => {
      const t = Math.min((ts - startTs) / TEASER_DURATION_MS, 1)
      const eased = Math.sin(t * Math.PI) // 0 → peak at t=0.5 → back to 0
      const pos = teaserFrames * eased
      positionRef.current = pos
      setFrameIndex(wrapFrame(Math.round(pos), totalFrames))
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step)
      } else {
        animFrameRef.current = null
        positionRef.current = 0
        setFrameIndex(0)
      }
    }
    animFrameRef.current = requestAnimationFrame(step)
    return cancelAnimation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSettled, totalFrames, hintDismissed])

  const dismiss = useCallback(() => setHintDismissed(true), [])

  // Momentum coast — decays velocity each tick (friction normalized to real elapsed
  // time, not assumed 60fps) and sweeps positionRef until it drops below STOP_VELOCITY.
  const startMomentum = useCallback(() => {
    let lastTs: number | null = null
    const step = (ts: number) => {
      const dt = lastTs == null ? 16 : ts - lastTs
      lastTs = ts
      velocityRef.current *= Math.pow(FRICTION, dt / 16)
      positionRef.current += velocityRef.current * dt
      setFrameIndex(wrapFrame(Math.round(positionRef.current), totalFrames))
      if (Math.abs(velocityRef.current) < STOP_VELOCITY) {
        animFrameRef.current = null
        return
      }
      animFrameRef.current = requestAnimationFrame(step)
    }
    animFrameRef.current = requestAnimationFrame(step)
  }, [totalFrames])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    cancelAnimation() // kills any in-flight momentum coast or auto-spin teaser
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
    const rawPosition = dragStartFrame.current + delta / PIXELS_PER_FRAME
    positionRef.current = rawPosition
    setFrameIndex(wrapFrame(Math.round(rawPosition), totalFrames))

    // Instantaneous velocity from this move alone, so a slow drag that ends in a
    // sharp flick reflects only the flick — not an average over the whole drag.
    const dt = now - lastMoveTimeRef.current
    if (dt > 0) {
      velocityRef.current = (e.clientX - lastMoveXRef.current) / PIXELS_PER_FRAME / dt
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
    const dir = e.deltaY > 0 ? 1 : -1
    positionRef.current = frameIndex + dir
    setFrameIndex(prev => wrapFrame(prev + dir, totalFrames))
    dismiss()
  }, [totalFrames, dismiss, cancelAnimation, frameIndex])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      cancelAnimation()
      setFrameIndex(prev => wrapFrame(prev - 1, totalFrames))
      dismiss()
    } else if (e.key === 'ArrowRight') {
      cancelAnimation()
      setFrameIndex(prev => wrapFrame(prev + 1, totalFrames))
      dismiss()
    }
  }, [totalFrames, dismiss, cancelAnimation])

  const currentAngle = ANGLES[frameIndex] ?? Math.round(frameIndex * (360 / totalFrames))

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
      {/* Ambient amber glow — matches scan3d brand color */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 55% at 50% 65%, rgba(251,191,36,0.05) 0%, transparent 70%)',
        }}
      />

      {/* Frame stack — all images stacked; only the active frame is visible.
           A frame that failed to load renders a placeholder tile instead of a raw <img>. */}
      {imageUrls.map((url, i) => (
        frameStatuses[i] === 'error' ? (
          <div
            key={i}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-900"
            style={{ opacity: i === frameIndex ? 1 : 0 }}
          >
            <ImageOff className="w-8 h-8 text-zinc-600" />
            <span className="text-zinc-600 text-[10px] font-mono">Frame {i + 1} unavailable</span>
          </div>
        ) : (
          <img
            key={i}
            src={url}
            alt=""
            decoding="async"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ opacity: i === frameIndex ? 1 : 0, pointerEvents: 'none' }}
            draggable={false}
          />
        )
      ))}

      {/* Loading overlay — waits for every frame to settle (load OR error), not just load */}
      {!allSettled && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90">
          <div className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-slate-400 animate-spin mb-4" />
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

      {/* Drag hint — shown until first interaction, positioned above the HUD */}
      {allSettled && !hintDismissed && (
        <div className="absolute inset-x-0 bottom-20 flex justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-black/55 backdrop-blur-sm border border-white/10 rounded-full px-3.5 py-1.5 animate-pulse">
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400/60" />
            <span className="text-white/50 text-[11px] font-medium tracking-wide">
              Drag left or right to rotate
            </span>
          </div>
        </div>
      )}

      {/* HUD — frame dots + degree indicator */}
      {allSettled && (
        <div className="absolute bottom-5 inset-x-0 flex justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-3 bg-black/55 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              {imageUrls.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-150 ${
                    i === frameIndex
                      ? 'w-2.5 h-2.5 bg-slate-400'
                      : 'w-1.5 h-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
            <div className="w-px h-4 bg-white/15 flex-shrink-0" />
            <span className="text-white/55 text-[11px] font-mono tabular-nums w-8 text-center">
              {currentAngle}°
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
