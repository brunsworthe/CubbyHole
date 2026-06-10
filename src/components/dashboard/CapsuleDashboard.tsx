'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, Box, Palette, FileText, Mountain, Layers, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { getAllCaptures, deleteCapture, updateCapture, clearCaptures } from '@/lib/captureDB'
import type { CaptureRecord } from '@/lib/captureDB'
import CaptureViewerModal from '@/components/capture/CaptureViewerModal'
import type { ViewableCapture } from '@/components/capture/CaptureViewerModal'

type LoadedCapture = CaptureRecord & { url: string }

// ── Mode config ───────────────────────────────────────────────────────────────

type ModeKey = 'scan3d' | 'relief180' | 'artwork2d' | 'document'

const MODE_CONFIG: Record<ModeKey, {
  icon: React.ComponentType<{ className?: string }>
  badge: string
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

// ── DeleteConfirmModal ────────────────────────────────────────────────────────

function DeleteConfirmModal({
  capture,
  onConfirm,
  onCancel,
}: {
  capture: LoadedCapture
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
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base leading-snug">
              Delete memory?
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5 truncate">
              {capture.title ?? capture.type}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed mb-5">
          This will permanently remove the captured item and all associated frames from your local storage. This cannot be undone.
        </p>

        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── EditDetailsModal ──────────────────────────────────────────────────────────

function EditDetailsModal({
  capture,
  onSave,
  onCancel,
}: {
  capture: LoadedCapture
  onSave: (title: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(capture.title ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Edit details</h3>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Preview row */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-zinc-700">
            {capture.mediaType === 'image' ? (
              <img src={capture.url} alt="" className="w-full h-full object-cover" draggable={false} />
            ) : (
              <video src={capture.url} className="w-full h-full object-cover" muted preload="metadata" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">{capture.type}</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 truncate">
              {capture.title ?? 'Unnamed memory'}
            </p>
          </div>
        </div>

        {/* Input */}
        <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wide mb-1.5">
          Name
        </label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(value.trim()) }}
          placeholder={capture.type}
          maxLength={60}
          className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:border-amber-400 dark:focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 text-sm outline-none transition-colors mb-5"
        />

        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(value.trim())}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CaptureCard ───────────────────────────────────────────────────────────────

interface CardProps {
  capture: LoadedCapture
  isDeleting: boolean
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

function CaptureCard({ capture, isDeleting, onView, onEdit, onDelete }: CardProps) {
  const { icon: Icon, badge } = getModeConfig(capture.mode)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const dateStr = new Date(capture.timestamp).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div
      className={`group relative text-left w-full rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-xl hover:shadow-black/8 dark:hover:shadow-black/50 hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset transition-all duration-300 ${
        menuOpen ? 'z-10' : ''
      } ${
        isDeleting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onView() }}
    >
      {/* Thumbnail — clipped independently so the menu can overflow the card */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-zinc-800 rounded-t-2xl">
        {capture.mediaType === 'image' ? (
          <img
            src={capture.url}
            alt={capture.title ?? capture.type}
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

        {/* Hover scrim + CTA */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center pointer-events-none">
          <div className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full px-4 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5 shadow-lg">
            <Icon className="w-3.5 h-3.5" />
            View
          </div>
        </div>

        {/* Video badge */}
        {capture.mediaType === 'video' && (
          <div className="absolute top-2 left-2 bg-black/55 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-mono text-white/70">
            VIDEO
          </div>
        )}
      </div>

      {/* Ellipsis menu — positioned relative to the card outer div, not the thumbnail */}
      <div
        ref={menuRef}
        className="absolute top-2 right-2 z-20"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="w-7 h-7 rounded-lg bg-black/40 hover:bg-black/65 backdrop-blur-sm flex items-center justify-center text-white/65 hover:text-white transition-colors"
          aria-label="Card options"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <div className="absolute top-8 right-0 w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
            <button
              onClick={() => { setMenuOpen(false); onEdit() }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
              Edit Details
            </button>
            <div className="border-t border-slate-100 dark:border-zinc-800" />
            <button
              onClick={() => { setMenuOpen(false); onDelete() }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
            >
              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
              Delete Memory
            </button>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-3 pt-2.5 pb-3">
        <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-1.5 ${badge}`}>
          <Icon className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{capture.type}</span>
        </div>
        {capture.title ? (
          <>
            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 leading-snug line-clamp-2 mb-0.5">
              {capture.title}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500">{dateStr}</p>
          </>
        ) : (
          <p className="text-xs text-slate-400 dark:text-zinc-500">{dateStr}</p>
        )}
      </div>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ onOpenCapture }: { onOpenCapture: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-amber-400/20 dark:bg-amber-400/10 blur-3xl scale-150" />
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/60 dark:to-orange-950/40 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-center shadow-inner">
          <Camera className="w-10 h-10 text-amber-500 dark:text-amber-400" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 dark:text-zinc-100 mb-2 tracking-tight">
        Your Time Capsule is empty.
      </h3>
      <p className="text-sm text-slate-500 dark:text-zinc-500 max-w-xs leading-relaxed mb-7">
        Scan a 3D object, photograph artwork, or digitize a document — every capture is preserved here in full fidelity, forever.
      </p>

      <button
        onClick={onOpenCapture}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-md shadow-amber-500/25"
      >
        <Camera className="w-4 h-4" />
        Capture your first memory
      </button>

      <div className="mt-8 flex items-center gap-3 flex-wrap justify-center">
        {(Object.entries(MODE_CONFIG) as [ModeKey, typeof MODE_CONFIG[ModeKey]][]).map(([key, { icon: Icon, badge }]) => (
          <div key={key} className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${badge}`}>
            <Icon className="w-3 h-3" />
            {{ scan3d: '360° Object', relief180: 'Textured Relief', artwork2d: '2D Masterpiece', document: 'Document' }[key]}
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
  const [deleteTarget, setDeleteTarget] = useState<LoadedCapture | null>(null)
  const [editTarget, setEditTarget] = useState<LoadedCapture | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
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

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleteTarget(null)
    setDeletingIds(prev => new Set(prev).add(id))
    // Remove after exit transition, delete from DB in parallel
    setTimeout(() => {
      setCaptures(prev => prev.filter(c => c.id !== id))
      setDeletingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }, 300)
    deleteCapture(id).catch(() => {})
  }, [deleteTarget])

  // ── Clear DB ───────────────────────────────────────────────────────────────

  const handleClearDB = useCallback(() => {
    clearCaptures().catch(() => {})
    urlsRef.current.forEach(u => URL.revokeObjectURL(u))
    urlsRef.current = []
    setCaptures([])
  }, [])

  // ── Edit ───────────────────────────────────────────────────────────────────

  const handleEditSave = useCallback((title: string) => {
    if (!editTarget) return
    const id = editTarget.id
    const trimmed = title || undefined
    setEditTarget(null)
    setCaptures(prev => prev.map(c => c.id === id ? { ...c, title: trimmed } : c))
    updateCapture(id, { title: trimmed }).catch(() => {})
  }, [editTarget])

  // ── Section header ─────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  // ── Render ─────────────────────────────────────────────────────────────────

  // Loading skeleton — no footer yet, data hasn't landed
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

  // Unified render — empty state OR grid, always followed by the dev footer
  return (
    <section aria-label="My Captures">
      {sectionHeader}

      {captures.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <EmptyState onOpenCapture={onOpenCapture} />
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-0">
          {captures.map(capture => (
            <div key={capture.id} className="break-inside-avoid mb-3">
              <CaptureCard
                capture={capture}
                isDeleting={deletingIds.has(capture.id)}
                onView={() => setSelected({ ...capture })}
                onEdit={() => setEditTarget(capture)}
                onDelete={() => setDeleteTarget(capture)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Developer reset utility */}
      <div className="mt-8 pt-5 border-t border-slate-100 dark:border-zinc-800/70 flex justify-center">
        <button
          onClick={handleClearDB}
          className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/25 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Clear Database
        </button>
      </div>

      {/* Modals */}
      {selected && (
        <CaptureViewerModal capture={selected} onClose={() => setSelected(null)} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          capture={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {editTarget && (
        <EditDetailsModal
          capture={editTarget}
          onSave={handleEditSave}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </section>
  )
}
