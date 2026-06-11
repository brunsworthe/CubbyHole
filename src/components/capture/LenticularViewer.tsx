'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ArrowLeftRight } from 'lucide-react'

const PIXELS_PER_FRAME = 32
const POSITIONS = ['XL', 'L', 'TD', 'R', 'XR']
const ANGLE_LABELS = ['-80°', '-40°', '0°', '+40°', '+80°']

interface Props {
  imageUrls: string[]
}

export default function LenticularViewer({ imageUrls }: Props) {
  const totalFrames = imageUrls.length
  const centerIndex = Math.floor(totalFrames / 2)
  const [frameIndex, setFrameIndex] = useState(centerIndex)
  const [isDragging, setIsDragging] = useState(false)
  const [hintDismissed, setHintDismissed] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0)

  const dragStartX = useRef(0)
  const dragStartFrame = useRef(centerIndex)

  const allLoaded = loadedCount >= totalFrames

  // Preload all frames for instant scrubbing
  useEffect(() => {
    if (!totalFrames) return
    let cancelled = false
    setLoadedCount(0)
    imageUrls.forEach(url => {
      const img = new Image()
      img.onload = img.onerror = () => {
        if (!cancelled) setLoadedCount(n => n + 1)
      }
      img.src = url
    })
    return () => { cancelled = true }
  }, [imageUrls, totalFrames])

  const dismiss = useCallback(() => setHintDismissed(true), [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartX.current = e.clientX
    dragStartFrame.current = frameIndex
    setIsDragging(true)
    setHintDismissed(true)
  }, [frameIndex])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const delta = e.clientX - dragStartX.current
    const frameDelta = Math.round(delta / PIXELS_PER_FRAME)
    // Drag right → higher index (right-side lighting); clamp, no wrap-around
    const next = Math.max(0, Math.min(totalFrames - 1, dragStartFrame.current + frameDelta))
    setFrameIndex(next)
  }, [isDragging, totalFrames])

  const onPointerUp = useCallback(() => setIsDragging(false), [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const dir = e.deltaX !== 0 ? (e.deltaX > 0 ? 1 : -1) : (e.deltaY > 0 ? 1 : -1)
    setFrameIndex(prev => Math.max(0, Math.min(totalFrames - 1, prev + dir)))
    dismiss()
  }, [totalFrames, dismiss])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setFrameIndex(prev => Math.max(0, prev - 1))
      dismiss()
    } else if (e.key === 'ArrowRight') {
      setFrameIndex(prev => Math.min(totalFrames - 1, prev + 1))
      dismiss()
    }
  }, [totalFrames, dismiss])

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

      {/* Frame stack — only the active frame is visible */}
      {imageUrls.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{ opacity: i === frameIndex ? 1 : 0, pointerEvents: 'none' }}
          draggable={false}
        />
      ))}

      {/* Loading overlay */}
      {!allLoaded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90">
          <div className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-orange-400 animate-spin mb-4" />
          <p className="text-white/40 text-xs font-mono tracking-widest">
            {loadedCount} / {totalFrames} frames
          </p>
        </div>
      )}

      {/* Drag hint — shown until first interaction */}
      {allLoaded && !hintDismissed && (
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
      {allLoaded && (
        <div className="absolute bottom-5 inset-x-0 flex justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-3 bg-black/55 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2.5">
            {/* 5 dots indicating the arc position */}
            <div className="flex items-center gap-1.5">
              {imageUrls.map((_, i) => (
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
