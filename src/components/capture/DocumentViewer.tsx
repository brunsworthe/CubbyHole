'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react'
import { useTiltZoom, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, clamp } from './useTiltZoom'

const ACCENT = '#38bdf8'

type DocPage = {
  lines: number[]
  hasTable?: boolean
  hasSeal?: boolean
}

const PAGES: DocPage[] = [
  { lines: [78, 92, 64, 86, 58], hasSeal: true },
  { lines: [88, 60, 74, 82], hasTable: true },
  { lines: [50, 72, 38], hasSeal: true },
]

function SealGraphic() {
  return (
    <svg viewBox="0 0 80 80" className="w-14 h-14">
      <circle cx="40" cy="40" r="30" fill="none" stroke={ACCENT} strokeWidth="2.5" />
      <circle cx="40" cy="40" r="23" fill="none" stroke={ACCENT} strokeWidth="1.2" strokeDasharray="2.5 2.5" opacity="0.55" />
      <path d="M 40 24 L 44 36 L 57 36 L 46 44 L 50 57 L 40 49 L 30 57 L 34 44 L 23 36 L 36 36 Z" fill={ACCENT} opacity="0.85" />
    </svg>
  )
}

function DocumentPage({ page, tilt }: { page: DocPage; tilt: { x: number; y: number } }) {
  return (
    <div className="w-full h-full flex-shrink-0 relative" style={{ transformStyle: 'preserve-3d' }}>
      {/* Paper base */}
      <div
        className="absolute inset-0 rounded-sm"
        style={{
          transform: 'translateZ(6px)',
          background: 'linear-gradient(160deg, #ffffff 0%, #f4f4f5 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
        }}
      />

      {/* Printed content */}
      <div className="absolute inset-0 p-6 flex flex-col" style={{ transform: 'translateZ(22px)' }}>
        <div className="h-1.5 w-10 rounded-full mb-2.5" style={{ background: ACCENT }} />
        <div className="h-2.5 w-4/5 rounded-full bg-zinc-300 mb-4" />
        <div className="space-y-2">
          {page.lines.map((w, i) => (
            <div key={i} className="h-1.5 rounded-full bg-zinc-200" style={{ width: `${w}%` }} />
          ))}
        </div>
        {page.hasTable && (
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-3.5 rounded bg-zinc-100 border border-zinc-200" />
            ))}
          </div>
        )}
        {page.hasSeal && (
          <div className="flex-1 flex items-end justify-end">
            <SealGraphic />
          </div>
        )}
      </div>

      {/* Glare / sheen overlay — drifts opposite the tilt, matching the 2D canvas feel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translateZ(40px) translate(${tilt.y * 1.4}px, ${tilt.x * 1.4}px)`,
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.32) 0%, transparent 40%, transparent 64%, rgba(255,255,255,0.08) 100%)',
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  )
}

interface Props {
  imageUrl?: string
}

export default function DocumentViewer({ imageUrl }: Props) {
  const {
    ref, tilt, active, zoomScale,
    pedestalScale, ambientScale, transitionClass,
    adjustZoom, handlers,
  } = useTiltZoom()

  const pageCount = imageUrl ? 1 : PAGES.length
  const [pageIndex, setPageIndex] = useState(0)
  const goPrev = () => setPageIndex((i) => clamp(i - 1, 0, pageCount - 1))
  const goNext = () => setPageIndex((i) => clamp(i + 1, 0, pageCount - 1))

  return (
    <div className="relative w-full h-full flex items-center justify-center px-8" style={{ perspective: '1500px' }}>
      {/* Ambient stage glow — fills the empty space as the document is zoomed out */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none -z-20 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `scale(${ambientScale})` }}
      >
        <div
          className="w-2/3 aspect-square rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.10) 0%, transparent 70%)' }}
        />
      </div>

      <div
        ref={ref}
        {...handlers}
        className={`relative w-full max-w-xs aspect-[4/5] cursor-grab active:cursor-grabbing touch-none transition-transform ${transitionClass}`}
        style={{
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${zoomScale + (active ? 0.02 : 0)})`,
        }}
      >
        {/* Stacked pages peeking out from beneath the top sheet */}
        <div className="absolute inset-0 rounded-sm bg-zinc-300/70" style={{ transform: 'translate(3px, 3px) translateZ(-4px)' }} />
        <div className="absolute inset-0 rounded-sm bg-zinc-200/70" style={{ transform: 'translate(6px, 6px) translateZ(-8px)' }} />

        {/* Page carousel — real image or mock pages */}
        <div className="absolute inset-0 rounded-sm shadow-2xl overflow-hidden" style={{ transformStyle: 'preserve-3d' }}>
          {imageUrl ? (
            /* Real captured document */
            <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
              <div
                className="absolute inset-0 bg-white"
                style={{ transform: 'translateZ(6px)' }}
              >
                <img
                  src={imageUrl}
                  alt="Captured document"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              </div>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  transform: `translateZ(40px) translate(${tilt.y * 1.4}px, ${tilt.x * 1.4}px)`,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.32) 0%, transparent 40%, transparent 64%, rgba(255,255,255,0.08) 100%)',
                  mixBlendMode: 'overlay',
                }}
              />
            </div>
          ) : (
            /* Mock page carousel */
            <div
              className="absolute inset-0 flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateX(-${pageIndex * 100}%)` }}
            >
              {PAGES.map((page, i) => (
                <DocumentPage key={i} page={page} tilt={tilt} />
              ))}
            </div>
          )}
        </div>

        {/* Floating drop shadow / pedestal — scales with zoom for a sense of physical depth */}
        <div
          className={`absolute -bottom-7 inset-x-10 h-7 rounded-full blur-xl -z-10 transition-transform ${transitionClass}`}
          style={{
            background: 'rgba(0,0,0,0.32)',
            transform: `translateX(${tilt.y * -1.6}px) scale(${pedestalScale}) scaleX(${1 - Math.min(Math.abs(tilt.y) * 0.012, 0.25)})`,
          }}
        />
      </div>

      {/* Pagination controls — hidden for single-page real captures */}
      {pageCount > 1 && <div className="absolute bottom-5 left-5 z-10 flex items-center gap-1 bg-black/55 backdrop-blur-sm border border-white/10 rounded-full px-1.5 py-1.5">
        <button
          onClick={goPrev}
          disabled={pageIndex === 0}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-white/70 text-xs font-medium px-1.5 select-none tabular-nums whitespace-nowrap">
          Page {pageIndex + 1} of {pageCount}
        </span>
        <button
          onClick={goNext}
          disabled={pageIndex === pageCount - 1}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>}

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
