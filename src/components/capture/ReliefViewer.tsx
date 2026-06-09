'use client'

import { Plus, Minus } from 'lucide-react'
import { useReliefOrbit, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from './useReliefOrbit'

const ACCENT = '#fb923c'

const PEAK_DOTS = [
  { l: '18%', t: '14%', s: '8%',   c: '#fbbf24' },
  { l: '42%', t: '10%', s: '6%',   c: ACCENT     },
  { l: '74%', t: '8%',  s: '7%',   c: '#fbbf24'  },
  { l: '11%', t: '40%', s: '5.5%', c: '#fdba74'  },
  { l: '52%', t: '52%', s: '7.5%', c: '#f97316'  },
  { l: '80%', t: '66%', s: '6%',   c: '#fbbf24'  },
  { l: '28%', t: '74%', s: '6.5%', c: ACCENT      },
  { l: '66%', t: '32%', s: '5%',   c: '#fed7aa'  },
]

export default function ReliefViewer() {
  const {
    ref, rotation, isDragging, zoomScale,
    pedestalScale, ambientScale, adjustZoom, handlers,
  } = useReliefOrbit()

  const transitionClass = isDragging
    ? ''
    : 'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'

  return (
    <div
      className="relative w-full h-full flex items-center justify-center px-8"
      style={{ perspective: '600px' }}
    >
      {/* Ambient stage glow */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none -z-20 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `scale(${ambientScale})` }}
      >
        <div
          className="w-2/3 aspect-square rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.12) 0%, transparent 70%)' }}
        />
      </div>

      {/* Artwork canvas */}
      <div
        ref={ref}
        {...handlers}
        className={`relative w-full max-w-xs aspect-square cursor-grab active:cursor-grabbing touch-none ${transitionClass}`}
        style={{
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${zoomScale + (isDragging ? 0.01 : 0)})`,
        }}
      >
        {/* Canvas stretcher edge — becomes visible as a dark slab when rotated */}
        <div
          className="absolute inset-0"
          style={{ background: '#78350f', transform: 'translateZ(-8px)' }}
        />

        {/* Base — warm cream canvas */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(160deg, #fef9c3 0%, #fef3c7 50%, #fde68a 100%)',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
          }}
        />

        {/* Z=12 — soft wash bands */}
        <div className="absolute" style={{
          transform: 'translateZ(12px)',
          left: '6%', top: '62%', width: '88%', height: '22%',
          background: 'rgba(180,83,9,0.38)',
          borderRadius: '45% 45% 50% 50% / 45% 45% 55% 55%',
        }} />
        <div className="absolute" style={{
          transform: 'translateZ(12px)',
          left: '12%', top: '40%', width: '76%', height: '16%',
          background: 'rgba(217,119,6,0.42)',
          borderRadius: '50% 50% 45% 45% / 50% 50% 45% 45%',
        }} />

        {/* Z=28 — large organic blobs */}
        <div className="absolute" style={{
          transform: 'translateZ(28px)',
          left: '7%', top: '18%', width: '36%', height: '32%',
          background: '#c2410c', opacity: 0.82,
          borderRadius: '60% 40% 55% 45% / 55% 45% 60% 40%',
        }} />
        <div className="absolute" style={{
          transform: 'translateZ(28px)',
          left: '56%', top: '46%', width: '32%', height: '26%',
          background: '#ea580c', opacity: 0.78,
          borderRadius: '45% 55% 40% 60% / 50% 50% 55% 45%',
        }} />

        {/* Z=44 — raised accent shapes */}
        <div className="absolute" style={{
          transform: 'translateZ(44px)',
          left: '22%', top: '28%', width: '55%', height: '11%',
          background: ACCENT, borderRadius: '50%',
        }} />
        <div className="absolute" style={{
          transform: 'translateZ(44px)',
          left: '64%', top: '16%', width: '22%', height: '28%',
          background: '#fed7aa', opacity: 0.9,
          borderRadius: '55% 45% 50% 50% / 55% 45% 50% 50%',
        }} />
        <div className="absolute" style={{
          transform: 'translateZ(44px)',
          left: '8%', top: '55%', width: '16%', height: '20%',
          background: '#fdba74', opacity: 0.85,
          borderRadius: '45% 55% 50% 50% / 50% 50% 45% 55%',
        }} />

        {/* Z=60 — peak elements (thick paint / macaroni dots) */}
        {PEAK_DOTS.map((d, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              transform: 'translateZ(60px)',
              left: d.l, top: d.t, width: d.s, aspectRatio: '1',
              background: d.c,
            }}
          />
        ))}

        {/* Glare sheen — shifts opposite to tilt */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translateZ(76px) translate(${rotation.y * -0.4}px, ${rotation.x * 0.4}px)`,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 40%, transparent 65%, rgba(255,255,255,0.06) 100%)',
            mixBlendMode: 'overlay',
          }}
        />

        {/* Drop shadow */}
        <div
          className={`absolute -bottom-7 inset-x-8 h-8 rounded-full blur-xl -z-10 ${isDragging ? '' : 'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
          style={{
            background: 'rgba(0,0,0,0.28)',
            transform: `translateX(${rotation.y * -1.2}px) scale(${pedestalScale}) scaleX(${1 - Math.min(Math.abs(rotation.y) * 0.004, 0.2)})`,
          }}
        />

        {/* 180° end-stop glow — orange edge flash at hemisphere limit */}
        {Math.abs(rotation.y) > 70 && (
          <div
            className="absolute inset-y-0 w-1 pointer-events-none"
            style={{
              [rotation.y > 0 ? 'right' : 'left']: 0,
              background: 'rgba(251,146,60,0.55)',
              transform: 'translateZ(82px)',
            }}
          />
        )}
      </div>

      {/* Rotation readout */}
      <div className="absolute bottom-5 left-5 z-10 flex items-center gap-2 bg-black/55 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
        <span className="text-white/35 text-[10px] font-mono tracking-wide">FRONT 180°</span>
        <div className="w-px h-3 bg-white/20" />
        <span className="text-white/55 text-[10px] font-mono tabular-nums">
          {rotation.y >= 0 ? '+' : ''}{Math.round(rotation.y)}°
        </span>
      </div>

      {/* Zoom controls */}
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
