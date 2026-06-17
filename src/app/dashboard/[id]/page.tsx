'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Plus, Box, Camera,
  FileText, Mountain, Palette, Cloud,
  CalendarDays, MapPin, User, X,
  MoreHorizontal, Pencil, Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import CaptureFlow from '@/components/capture/CaptureFlow'
import ThemeToggle from '@/components/ui/ThemeToggle'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Capsule {
  id: string
  name: string
  theme_color: string | null
}

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
  '3D':       { icon: Box,      badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',    label: '360° Object'     },
  'Relief':   { icon: Mountain, badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30', label: 'Textured Relief' },
  '2D':       { icon: Palette,  badge: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30', label: '2D Artwork'      },
  'Document': { icon: FileText, badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',            label: 'Document'        },
}

const FALLBACK_TYPE = {
  icon: Cloud,
  badge: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30',
  label: 'Capture',
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type as CaptureType] ?? FALLBACK_TYPE
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Append T00:00:00 so the Date constructor treats the ISO date string as local,
// not UTC — avoids the "one day off" shift on display.
function formatDate(isoDate: string, style: 'short' | 'long' = 'short') {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    month: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── CaptureCard ───────────────────────────────────────────────────────────────

function CaptureCard({
  capture, isDeleting, onClick, onEdit, onDelete,
}: {
  capture: Capture
  isDeleting: boolean
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { icon: Icon, badge, label } = getTypeConfig(capture.type)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div
      className={`group relative w-full overflow-hidden rounded-2xl bg-zinc-900 cursor-pointer hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/50 transition-all duration-300 ${
        menuOpen ? 'z-10 relative' : ''
      } ${isDeleting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
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

        {/* Top-left ellipsis menu */}
        <div
          ref={menuRef}
          className="absolute top-2.5 left-2.5 z-20"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-7 h-7 rounded-lg bg-black/40 hover:bg-black/65 backdrop-blur-sm flex items-center justify-center text-white/65 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute top-8 left-0 w-40 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onEdit() }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                Rename
              </button>
              <div className="border-t border-slate-100 dark:border-zinc-800" />
              <button
                onClick={() => { setMenuOpen(false); onDelete() }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                Delete
              </button>
            </div>
          )}
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
    </div>
  )
}

// ── EditCaptureModal ──────────────────────────────────────────────────────────

function EditCaptureModal({
  capture, onSave, onCancel,
}: {
  capture: Capture
  onSave: (title: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(capture.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Rename memory</h3>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && value.trim()) onSave(value.trim()) }}
          maxLength={60}
          className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:border-amber-400 dark:focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-zinc-100 text-sm outline-none transition-colors mb-5"
        />
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (value.trim()) onSave(value.trim()) }}
            disabled={!value.trim()}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DeleteCaptureModal ────────────────────────────────────────────────────────

function DeleteCaptureModal({
  capture, onConfirm, onCancel,
}: {
  capture: Capture
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base leading-snug">Delete memory?</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5 truncate">{capture.title}</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed mb-5">
          This will permanently remove this memory from the capsule. This cannot be undone.
        </p>
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-semibold transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
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

function EmptyState({ capsuleName, onAddMemory }: { capsuleName: string; onAddMemory: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-amber-400/15 dark:bg-amber-400/10 blur-3xl scale-150" />
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/60 dark:to-orange-950/40 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-center shadow-inner">
          <Camera className="w-11 h-11 text-amber-500 dark:text-amber-400" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 dark:text-zinc-100 mb-2 tracking-tight">
        {capsuleName} is empty
      </h3>
      <p className="text-sm text-slate-500 dark:text-zinc-500 max-w-xs leading-relaxed mb-2">
        Scan a 2D artwork, capture a clay model as a full 360° object, digitize a document, or record a textured relief surface.
      </p>
      <p className="text-sm text-slate-400 dark:text-zinc-600 max-w-xs leading-relaxed mb-8">
        Every capture is preserved here in full fidelity — forever.
      </p>

      <button
        onClick={onAddMemory}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-md shadow-amber-500/25"
      >
        <Camera className="w-4 h-4" />
        Scan your first memory
      </button>

      {/* Capture type pills */}
      <div className="mt-8 flex items-center gap-2 flex-wrap justify-center">
        {(Object.entries(TYPE_CONFIG) as [CaptureType, typeof TYPE_CONFIG[CaptureType]][]).map(
          ([type, { icon: Icon, badge, label }]) => (
            <div
              key={type}
              className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${badge}`}
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

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ capture, onClose }: { capture: Capture; onClose: () => void }) {
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
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-zinc-950"
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${badge}`}>
            <Icon className="w-3 h-3" />
            {label}
          </div>
          <span className="text-sm font-semibold text-zinc-200 truncate">
            {capture.title}
          </span>
        </div>
        <button
          onClick={onClose}
          className="ml-4 w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors flex-shrink-0"
          aria-label="Close viewer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Image fill */}
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
              {formatDate(capture.capture_date, 'long')}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CapsuleGalleryPage() {
  const router = useRouter()
  const { id: capsuleId } = useParams<{ id: string }>()

  const [capsule,         setCapsule]         = useState<Capsule | null>(null)
  const [captures,        setCaptures]        = useState<Capture[]>([])
  const [loading,         setLoading]         = useState(true)
  const [notFound,        setNotFound]        = useState(false)
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null)
  const [showCaptureFlow, setShowCaptureFlow] = useState(false)
  const [editTarget,      setEditTarget]      = useState<Capture | null>(null)
  const [deleteTarget,    setDeleteTarget]    = useState<Capture | null>(null)
  const [deletingIds,     setDeletingIds]     = useState<Set<string>>(new Set())

  // Lock body scroll while the full-screen capture flow is open
  useEffect(() => {
    document.body.style.overflow = showCaptureFlow ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showCaptureFlow])

  // ── Fetch capsule + its captures in parallel ──────────────────────────────

  const fetchData = useCallback(async (uid: string) => {
    setLoading(true)

    const [capsuleRes, capturesRes] = await Promise.all([
      supabase
        .from('capsules')
        .select('id, name, theme_color')
        .eq('id', capsuleId)
        .eq('profile_id', uid)   // RLS-enforced, but belt-and-suspenders
        .single(),
      supabase
        .from('captures')
        .select('*')
        .eq('capsule_id', capsuleId)
        .order('created_at', { ascending: false }),
    ])

    if (capsuleRes.error || !capsuleRes.data) {
      setNotFound(true)
    } else {
      setCapsule(capsuleRes.data as Capsule)
      setCaptures((capturesRes.data ?? []) as Capture[])
    }

    setLoading(false)
  }, [capsuleId])

  // ── Auth guard ────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      fetchData(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router, fetchData])

  // ── Rename capture ────────────────────────────────────────────────────────

  const handleEditSave = useCallback(async (title: string) => {
    if (!editTarget) return
    const id = editTarget.id
    setEditTarget(null)
    setCaptures(prev => prev.map(c => c.id === id ? { ...c, title } : c))
    const { error } = await supabase.from('captures').update({ title }).eq('id', id)
    if (error) console.error('RENAME ERROR:', error)
  }, [editTarget])

  // ── Delete capture ────────────────────────────────────────────────────────

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleteTarget(null)
    setDeletingIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      setCaptures(prev => prev.filter(c => c.id !== id))
      setDeletingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }, 300)
    const { error } = await supabase.from('captures').delete().eq('id', id)
    if (error) console.error('DELETE ERROR:', error)
  }, [deleteTarget])

  // ── Capture flow callbacks ────────────────────────────────────────────────

  const handleCaptureComplete = useCallback(() => {
    setShowCaptureFlow(false)
    // Re-fetches so that captures written to Supabase (once the camera
    // pipeline is migrated from IndexedDB in a future phase) appear here automatically.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchData(session.user.id)
    })
  }, [fetchData])

  // ── Accent color (from capsule.theme_color) ───────────────────────────────

  const accent = capsule?.theme_color ?? '#f59e0b'

  // ── 404 state ─────────────────────────────────────────────────────────────

  if (!loading && notFound) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-500 dark:text-zinc-500 mb-4">
            This capsule doesn&apos;t exist or you don&apos;t have access.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-200">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-900 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">

          {/* Back to Dashboard */}
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-600 hover:text-slate-700 dark:hover:text-zinc-300 text-sm font-medium transition-colors flex-shrink-0 -ml-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          {/* Vertical divider */}
          <div className="w-px h-4 bg-slate-200 dark:bg-zinc-800 flex-shrink-0" />

          {/* Capsule name + accent swatch */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all duration-300"
              style={{ background: `${accent}25`, border: `1.5px solid ${accent}55` }}
            >
              <Box className="w-2.5 h-2.5" style={{ color: accent }} />
            </div>

            {loading ? (
              <div className="h-4 w-32 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse" />
            ) : (
              <h1 className="font-bold text-base tracking-tight truncate">
                {capsule?.name ?? 'Gallery'}
              </h1>
            )}
          </div>

          {/* Right: theme toggle + desktop CTA */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            {!loading && (
              <button
                onClick={() => setShowCaptureFlow(true)}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold transition-opacity hover:opacity-90 active:opacity-75 flex-shrink-0 shadow-sm"
                style={{
                  background: accent,
                  boxShadow: `0 2px 8px ${accent}40`,
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Memory
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Count line */}
        {!loading && (
          <p className="text-sm text-slate-500 dark:text-zinc-500 mb-6">
            {captures.length === 0
              ? 'No memories yet'
              : `${captures.length} memor${captures.length !== 1 ? 'ies' : 'y'}`}
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : captures.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
            <EmptyState
              capsuleName={capsule?.name ?? 'This capsule'}
              onAddMemory={() => setShowCaptureFlow(true)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {captures.map(capture => (
              <CaptureCard
                key={capture.id}
                capture={capture}
                isDeleting={deletingIds.has(capture.id)}
                onClick={() => setSelectedCapture(capture)}
                onEdit={() => setEditTarget(capture)}
                onDelete={() => setDeleteTarget(capture)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Mobile FAB (only when there are captures — empty state has its own CTA) ── */}
      {!loading && captures.length > 0 && (
        <div className="sm:hidden fixed bottom-6 right-5 z-30">
          <button
            onClick={() => setShowCaptureFlow(true)}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl text-white text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-75"
            style={{
              background: accent,
              boxShadow: `0 8px 24px ${accent}45`,
            }}
          >
            <Plus className="w-5 h-5" />
            Add Memory
          </button>
        </div>
      )}

      {/* ── Image lightbox ── */}
      {selectedCapture && (
        <Lightbox
          capture={selectedCapture}
          onClose={() => setSelectedCapture(null)}
        />
      )}

      {/* ── Edit / Delete modals ── */}
      {editTarget && (
        <EditCaptureModal
          capture={editTarget}
          onSave={handleEditSave}
          onCancel={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteCaptureModal
          capture={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Capture flow overlay ──
          Opens the existing full-screen camera pipeline.
          capsuleId is available here for the camera pipeline to use
          once it is migrated from IndexedDB to Supabase inserts. ── */}
      {showCaptureFlow && (
        <CaptureFlow
          onClose={() => setShowCaptureFlow(false)}
          onAddToCapsule={handleCaptureComplete}
          capsuleId={capsuleId}
        />
      )}
    </div>
  )
}
