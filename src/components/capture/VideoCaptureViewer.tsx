'use client'

import { useState, useRef } from 'react'
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react'
import type { CaptureMode } from './CaptureFlow'
import { useTiltZoom, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from './useTiltZoom'

interface Props {
  videoUrl: string
  mode: CaptureMode
}

export default function VideoCaptureViewer({ videoUrl, mode }: Props) {
  const { ref, tilt, active, zoomScale, pedestalScale, ambientScale, transitionClass, adjustZoom, handlers } = useTiltZoom()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)

  const isRelief = mode === 'relief180'
  const ambientColor = isRelief ? 'rgba(251,146,60,0.12)' : 'rgba(251,191,36,0.08)'
  const accentHex = isRelief ? '#fb923c' : '#fbbf24'

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setIsPlaying(true) }
    else { v.pause(); setIsPlaying(false) }
  }

  const restart = () => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = 0
    v.play()
    setIsPlaying(true)
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center px-6" style={{ perspective: '1200px' }}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none -z-20 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `scale(${ambientScale})` }}
      >
        <div
          className="w-2/3 aspect-square rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${ambientColor} 0%, transparent 70%)` }}
        />
      </div>

      {/* Video container with hover-tilt effect */}
      <div
        ref={ref}
        {...handlers}
        className={`relative w-full max-w-xs cursor-grab active:cursor-grabbing touch-none transition-transform ${transitionClass}`}
        style={{
          aspectRatio: '9/16',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${zoomScale + (active ? 0.02 : 0)})`,
        }}
      >
        <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            autoPlay
            loop
            playsInline
            muted
          />
          {/* Play/pause tap target */}
          <div className="absolute inset-0 flex items-center justify-center" onClick={togglePlay} style={{ cursor: 'default' }}>
            {!isPlaying && (
              <div className="bg-black/45 backdrop-blur-sm rounded-full p-5">
                <Play className="w-8 h-8 text-white" fill="white" />
              </div>
            )}
          </div>
          {/* Glare */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translateZ(20px) translate(${tilt.y * -0.8}px, ${tilt.x * 0.8}px)`,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 42%)',
              mixBlendMode: 'overlay',
            }}
          />
        </div>

        {/* Drop shadow */}
        <div
          className={`absolute -bottom-7 inset-x-8 h-7 rounded-full blur-xl -z-10 transition-transform ${transitionClass}`}
          style={{
            background: 'rgba(0,0,0,0.30)',
            transform: `translateX(${tilt.y * -1.4}px) scale(${pedestalScale}) scaleX(${1 - Math.min(Math.abs(tilt.y) * 0.012, 0.25)})`,
          }}
        />
      </div>

      {/* Playback controls — bottom-left */}
      <div className="absolute bottom-5 left-5 z-10 flex items-center gap-0.5 bg-black/55 backdrop-blur-sm border border-white/10 rounded-full px-1.5 py-1.5">
        <button
          onClick={restart}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Restart"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={togglePlay}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
        </button>
        <span className="text-[10px] font-mono px-1.5 select-none" style={{ color: accentHex + 'bb' }}>
          {isRelief ? 'RELIEF 180°' : '360° ORBIT'}
        </span>
      </div>

      {/* Zoom controls — bottom-right */}
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
