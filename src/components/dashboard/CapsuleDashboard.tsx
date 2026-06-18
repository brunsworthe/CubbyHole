'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Box, Palette, FileText, Mountain, Cloud, X, CalendarDays, User, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Capture {
  id: string
  capsule_id: string
  title: string
  description: string | null
  capture_date: string
  location: string | null
  creator: string | null
  cloud_url: string
  type: '2D' | '3D' | 'Relief' | 'Document'
  created_at: string
}

// ── Type badge config ─────────────────────────────────────────────────────────

type CaptureType = '2D' | '3D' | 'Relief' | 'Document'

const TYPE_CONFIG: Record<CaptureType, {
  icon: React.ComponentType<{ className?: string }>
  badge: string
  label: string
}> = {
  '3D':       { icon: Box,      badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',    label: '3D'      },
  'Relief':   { icon: Mountain, badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40', label: 'Relief'  },
  '2D':       { icon: Palette,  badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40', label: '2D Art'  },
  'Document': { icon: FileText, badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',          label: 'Doc'     },
}

const FALLBACK_TYPE = {
  icon: Cloud,
  badge: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
  label: 'Capture',
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type as CaptureType] ?? FALLBACK_TYPE
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── MemoryCard ────────────────────────────────────────────────────────────────

function MemoryCard({ capture, onClick }: { capture: Capture; onClick: () => void }) {
  const [imgError, setImgError] = useState(false)
  const { icon: Icon, badge, label } = getTypeConfig(capture.type)

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left overflow-hidden rounded-2xl bg-zinc-900 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-all duration-300"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-800">
            <Cloud className="w-8 h-8 text-zinc-600" />
            <span className="text-[10px] font-mono text-zinc-600 tracking-widest">CLOUD</span>
          </div>
        ) : (
          <img
            src={capture.cloud_url}
            alt={capture.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            draggable={false}
            onError={() => setImgError(true)}
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

        {/* Top-right mode badge */}
        <div className="absolute top-2.5 right-2.5">
          <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border backdrop-blur-sm ${badge}`}>
            <Icon className="w-2.5 h-2.5 flex-shrink-0" />
            {label}
          </div>
        </div>

        {/* Bottom-left title + date */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-sm font-semibold line-clamp-2 leading-snug mb-0.5 drop-shadow-sm">
            {capture.title}
          </p>
          {capture.capture_date && (
            <p className="text-white/55 text-[11px] leading-none">
              {formatDate(capture.capture_date)}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-zinc-900 animate-pulse">
      <div className="aspect-[3/4] bg-zinc-800" />
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ onOpenCapture }: { onOpenCapture: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-slate-400/15 dark:bg-slate-400/10 blur-3xl scale-150" />
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-950/60 dark:to-slate-800/40 border border-slate-200/80 dark:border-slate-800/40 flex items-center justify-center shadow-inner">
          <Camera className="w-10 h-10 text-slate-500 dark:text-slate-400" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 dark:text-zinc-100 mb-2 tracking-tight">
        Your library is empty
      </h3>
      <p className="text-sm text-slate-500 dark:text-zinc-500 max-w-xs leading-relaxed mb-2">
        Scan a 3D object, capture artwork, or digitize a document — every memory is preserved here in full fidelity, forever.
      </p>
      <p className="text-sm text-slate-400 dark:text-zinc-600 max-w-xs leading-relaxed mb-8">
        Tap the camera button above to capture your first memory.
      </p>

      <button
        onClick={onOpenCapture}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-500 hover:bg-slate-400 active:bg-slate-600 text-white text-sm font-semibold transition-colors shadow-md shadow-slate-500/25"
      >
        <Camera className="w-4 h-4" />
        Capture your first memory
      </button>

      <div className="mt-8 flex items-center gap-2 flex-wrap justify-center">
        {(Object.entries(TYPE_CONFIG) as [CaptureType, typeof TYPE_CONFIG[CaptureType]][]).map(
          ([type, { icon: Icon, label }]) => (
            <div
              key={type}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400"
            >
              <Icon className="w-3 h-3" />
              {label}
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ── MemoryLightbox ────────────────────────────────────────────────────────────

function MemoryLightbox({ capture, onClose }: { capture: Capture; onClose: () => void }) {
  const { icon: Icon, badge, label } = getTypeConfig(capture.type)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handler)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${badge}`}>
            <Icon className="w-3 h-3" />
            {label}
          </div>
          <span className="text-sm font-semibold text-zinc-200 truncate">{capture.title}</span>
        </div>
        <button
          onClick={onClose}
          className="ml-4 w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-6 overflow-hidden">
        <img
          src={capture.cloud_url}
          alt={capture.title}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          draggable={false}
        />
      </div>

      {/* Footer metadata */}
      <div className="flex-shrink-0 px-5 py-3.5 border-t border-zinc-800/60 bg-zinc-950/80">
        <div className="flex items-center justify-center gap-5 flex-wrap">
          {capture.capture_date && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <CalendarDays className="w-3.5 h-3.5" />
              {formatDate(capture.capture_date)}
            </span>
          )}
          {capture.creator && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <User className="w-3.5 h-3.5" />
              {capture.creator}
            </span>
          )}
          {capture.location && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <MapPin className="w-3.5 h-3.5" />
              {capture.location}
            </span>
          )}
        </div>
        {capture.description && (
          <p className="text-xs text-zinc-600 text-center mt-2 max-w-sm mx-auto leading-relaxed">
            {capture.description}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onOpenCapture: () => void
}

export default function CapsuleDashboard({ onOpenCapture }: Props) {
  const router = useRouter()
  const [memories, setMemories] = useState<Capture[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null)

  const fetchMemories = useCallback(async (uid: string) => {
    setIsLoading(true)

    const { data: capsuleData, error: capsuleError } = await supabase
      .from('capsules')
      .select('id')
      .eq('profile_id', uid)

    if (capsuleError || !capsuleData?.length) {
      setMemories([])
      setIsLoading(false)
      return
    }

    const capsuleIds = capsuleData.map(c => c.id)

    const { data: capturesData } = await supabase
      .from('captures')
      .select('*')
      .in('capsule_id', capsuleIds)
      .order('created_at', { ascending: false })

    setMemories((capturesData ?? []) as Capture[])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      fetchMemories(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router, fetchMemories])

  // ── Section header ─────────────────────────────────────────────────────────

  const sectionHeader = (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          My Memories
        </h2>
        {!isLoading && (
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">
            {memories.length === 0
              ? 'Nothing here yet'
              : `${memories.length} memor${memories.length !== 1 ? 'ies' : 'y'}`}
          </p>
        )}
      </div>
      <button
        onClick={onOpenCapture}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-500 hover:bg-slate-400 active:bg-slate-600 text-white text-xs font-semibold transition-colors shadow-sm shadow-slate-500/20 flex-shrink-0"
      >
        <Camera className="w-3.5 h-3.5" />
        Capture New
      </button>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <section aria-label="My Memories">
        {sectionHeader}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </section>
    )
  }

  return (
    <>
      <section aria-label="My Memories">
        {sectionHeader}

        {memories.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
            <EmptyState onOpenCapture={onOpenCapture} />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {memories.map(capture => (
              <MemoryCard key={capture.id} capture={capture} onClick={() => setSelectedCapture(capture)} />
            ))}
          </div>
        )}
      </section>

      {selectedCapture && (
        <MemoryLightbox capture={selectedCapture} onClose={() => setSelectedCapture(null)} />
      )}
    </>
  )
}
