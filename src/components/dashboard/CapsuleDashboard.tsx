'use client'

import { useState, useEffect, useRef } from 'react'
import { Camera, Box, Palette, FileText, Mountain, Layers } from 'lucide-react'
import { getAllCaptures } from '@/lib/captureDB'
import type { CaptureRecord } from '@/lib/captureDB'
import CaptureViewerModal from '@/components/capture/CaptureViewerModal'
import type { ViewableCapture } from '@/components/capture/CaptureViewerModal'

type LoadedCapture = CaptureRecord & { url: string }

// ── Mode config ───────────────────────────────────────────────────────────────

type ModeKey = 'scan3d' | 'relief180' | 'artwork2d' | 'document'

const MODE_CONFIG: Record<ModeKey, {
  icon: React.ComponentType<{ className?: string }>
  badge: string   // Tailwind classes for light + dark badge
}> = {
  scan3d: {
    icon: Box,
    badge: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  },
  relief180: {
    icon: Mountain,
    badge: 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/60',
  },
  artwork2d: {
    icon: Palette,
    badge: 'bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900/60',
  },
  document: {
    icon: FileText,
    badge: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/60',
  },
}

const FALLBACK_CONFIG = {
  icon: Layers,
  badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
}

function getModeConfig(mode: string) {
  return MODE_CONFIG[mode as ModeKey] ?? FALLBACK_CONFIG
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CaptureCard({ capture, onClick }: { capture: LoadedCapture; onClick: () => void }) {
  const { icon: Icon, badge } = getModeConfig(capture.mode)
  const dateStr = new Date(capture.timestamp).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <button
      onClick={onClick}
      className="group text-left w-full rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-xl hover:shadow-black/8 dark:hover:shadow-black/50 hover:-translate-y-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-zinc-800">
        {capture.mediaType === 'image' ? (
          <img
            src={capture.url}
            alt={capture.type}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            draggable={false}
          />
        ) : (
          <video
            src={capture.url}
            preload="metadata"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            muted
            playsInline
            onLoadedMetadata={e => { e.currentTarget.currentTime = 0.5 }}
          />
        )}

        {/* Scrim + hover CTA */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full px-4 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5 shadow-lg">
            <Icon className="w-3.5 h-3.5" />
            View
          </div>
        </div>

        {/* Video badge */}
        {capture.mediaType === 'video' && (
          <div className="absolute top-2 right-2 bg-black/55 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-mono text-white/70">
            VIDEO
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pt-2.5 pb-3">
        <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-1.5 ${badge}`}>
          <Icon className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{capture.type}</span>
        </div>
        <p className="text-xs text-slate-400 dark:text-zinc-500">{dateStr}</p>
      </div>
    </button>
  )
}

function EmptyState({ onOpenCapture }: { onOpenCapture: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="relative mb-6">
        {/* Decorative glow */}
        <div className="absolute inset-0 rounded-full bg-amber-400/20 dark:bg-amber-400/10 blur-2xl scale-150" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/60 dark:to-orange-950/40 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-center shadow-inner">
          <Camera className="w-9 h-9 text-amber-500 dark:text-amber-400" />
        </div>
      </div>

      <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100 mb-1">
        No memories captured yet
      </h3>
      <p className="text-sm text-slate-500 dark:text-zinc-500 max-w-xs leading-relaxed mb-6">
        Scan a 3D object, photograph artwork, or digitize a document. Every capture is preserved here for you to revisit.
      </p>

      <button
        onClick={onOpenCapture}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm shadow-amber-500/30"
      >
        <Camera className="w-4 h-4" />
        Capture your first memory
      </button>

      {/* Soft feature hint row */}
      <div className="mt-8 flex items-center gap-5 flex-wrap justify-center">
        {(Object.entries(MODE_CONFIG) as [ModeKey, typeof MODE_CONFIG[ModeKey]][]).map(([key, { icon: Icon, badge }]) => (
          <div key={key} className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${badge}`}>
            <Icon className="w-3 h-3" />
            {MODE_CONFIG[key] ? (
              {
                scan3d:    '360° Object',
                relief180: 'Textured Relief',
                artwork2d: '2D Masterpiece',
                document:  'Document',
              }[key]
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 animate-pulse">
      <div className="aspect-[4/3] bg-slate-100 dark:bg-zinc-800" />
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="h-3 w-24 bg-slate-100 dark:bg-zinc-800 rounded-full" />
        <div className="h-2.5 w-16 bg-slate-100 dark:bg-zinc-800 rounded-full" />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onOpenCapture: () => void
}

export default function CapsuleDashboard({ onOpenCapture }: Props) {
  const [captures, setCaptures] = useState<LoadedCapture[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ViewableCapture | null>(null)
  const urlsRef = useRef<string[]>([])

  useEffect(() => {
    getAllCaptures()
      .then(records => {
        const loaded = records.map(r => {
          const url = URL.createObjectURL(r.asset)
          urlsRef.current.push(url)
          return { ...r, url }
        })
        setCaptures(loaded)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    return () => {
      urlsRef.current.forEach(u => URL.revokeObjectURL(u))
      urlsRef.current = []
    }
  }, [])

  // Re-load captures after the viewer closes in case a new one was added
  const handleCloseViewer = () => setSelected(null)

  // ── Section header ──────────────────────────────────────────────────────────
  const sectionHeader = (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          My Captures
        </h2>
        {!loading && (
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">
            {captures.length === 0
              ? 'Nothing here yet'
              : `${captures.length} item${captures.length !== 1 ? 's' : ''} preserved locally`}
          </p>
        )}
      </div>
      <button
        onClick={onOpenCapture}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-xs font-semibold transition-colors shadow-sm shadow-amber-500/20 flex-shrink-0"
      >
        <Camera className="w-3.5 h-3.5" />
        Capture New
      </button>
    </div>
  )

  if (loading) {
    return (
      <section aria-label="My Captures">
        {sectionHeader}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </section>
    )
  }

  if (captures.length === 0) {
    return (
      <section aria-label="My Captures">
        {sectionHeader}
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <EmptyState onOpenCapture={onOpenCapture} />
        </div>
      </section>
    )
  }

  return (
    <section aria-label="My Captures">
      {sectionHeader}

      {/* Masonry-style 2-col columns layout on mobile, grid on wider screens */}
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-0">
        {captures.map(capture => (
          <div key={capture.id} className="break-inside-avoid mb-3">
            <CaptureCard
              capture={capture}
              onClick={() => setSelected({ ...capture })}
            />
          </div>
        ))}
      </div>

      {selected && (
        <CaptureViewerModal capture={selected} onClose={handleCloseViewer} />
      )}
    </section>
  )
}
