'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Plus, Box, Camera,
  FileText, Mountain, Palette, Cloud,
  X, ArrowUp, ArrowDown,
  MoreHorizontal, Pencil, Trash2, Check,
  FolderOpen, Share2, LayoutGrid, List as ListIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import CaptureFlow from '@/components/capture/CaptureFlow'
import CaptureViewerModal, { type ViewableCapture } from '@/components/capture/CaptureViewerModal'
import ThemeToggle from '@/components/ui/ThemeToggle'
import BrandLink from '@/components/ui/BrandLink'
import VolumetricMeter from '@/components/dashboard/VolumetricMeter'
import { formatBytes } from '@/utils/formatters'

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
  cloud_frames: string[] | null
  cloud_relief_frames: string[] | null
  cloud_pages: string[] | null
  is_public?: boolean | null
  share_id?: string | null
  size_bytes?: number | null
}

// ── Type badge config ─────────────────────────────────────────────────────────

type CaptureType = '2D' | '3D' | 'Relief' | 'Document'

const TYPE_CONFIG: Record<CaptureType, {
  icon: React.ComponentType<{ className?: string }>
  color: string
  label: string
}> = {
  '3D':       { icon: Box,      color: '#f59e0b', label: '360° Object'     },
  'Relief':   { icon: Mountain, color: '#fb923c', label: 'Textured Relief' },
  '2D':       { icon: Palette,  color: '#a78bfa', label: '2D Artwork'      },
  'Document': { icon: FileText, color: '#38bdf8', label: 'Document'        },
}

const FALLBACK_TYPE = {
  icon: Cloud,
  color: '#71717a',
  label: 'Capture',
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type as CaptureType] ?? FALLBACK_TYPE
}

const TYPE_TO_MODE: Record<string, string> = {
  '3D': 'scan3d', 'Relief': 'relief180', '2D': 'artwork2d', 'Document': 'document',
}

function toViewable(c: Capture): ViewableCapture {
  return {
    id: c.id,
    mode: TYPE_TO_MODE[c.type] ?? 'scan3d',
    type: c.type,
    mediaType: 'image',
    timestamp: new Date(c.created_at).getTime(),
    title: c.title,
    cloudUrl: c.cloud_url,
    cloudFrames: c.cloud_frames ?? undefined,
    cloudReliefFrames: c.cloud_relief_frames ?? undefined,
    cloudPages: c.cloud_pages ?? undefined,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Append T00:00:00 so the Date constructor treats the ISO date string as local,
// not UTC — avoids the "one day off" shift on display.
function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── CaptureCard ───────────────────────────────────────────────────────────────

function CaptureCard({
  capture, isDeleting, onClick, onEdit, onDelete, onShare, isSelectMode, isSelected,
}: {
  capture: Capture
  isDeleting: boolean
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onShare: () => Promise<boolean>
  isSelectMode: boolean
  isSelected: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [justCopied, setJustCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { icon: Icon, color, label } = getTypeConfig(capture.type)

  const handleShareClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (justCopied) return
    const ok = await onShare()
    if (ok) {
      setJustCopied(true)
      setTimeout(() => setJustCopied(false), 2000)
    }
  }, [onShare, justCopied])

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
      } ${isDeleting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'} ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
      <div className={`relative aspect-[3/4] overflow-hidden transition-all duration-200 ${
        isSelected ? 'scale-95 opacity-80' : ''
      }`}>
        {isSelectMode && (
          <div className={`absolute top-2.5 left-2.5 z-30 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected ? 'bg-blue-500 border-blue-500' : 'bg-black/30 border-white/70 backdrop-blur-sm'
          }`}>
            {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
        )}
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

        {/* Bottom-right share button — hidden during selection mode */}
        {!isSelectMode && (
          <button
            onClick={handleShareClick}
            className={`absolute bottom-2.5 right-2.5 z-20 w-7 h-7 rounded-lg backdrop-blur-sm flex items-center justify-center transition-colors ${
              justCopied
                ? 'bg-emerald-500/90 text-white opacity-100'
                : 'bg-black/40 hover:bg-black/65 text-white/65 hover:text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
            }`}
            aria-label={justCopied ? 'Link copied' : 'Copy share link'}
          >
            {justCopied ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Top-right mode badge */}
        <div className="absolute top-2.5 right-2.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/10 bg-zinc-900/75 backdrop-blur-md text-white">
            <Icon className="w-2.5 h-2.5 flex-shrink-0" style={{ color }} />
            {label}
          </div>
        </div>

        {/* Top-left ellipsis menu — hidden during selection mode so it doesn't collide with the checkmark */}
        <div
          ref={menuRef}
          className={`absolute top-2.5 left-2.5 z-20 ${isSelectMode ? 'hidden' : ''}`}
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

        {/* Bottom-left title + date / size */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-sm font-semibold line-clamp-2 leading-snug mb-0.5 drop-shadow-sm">
            {capture.title}
          </p>
          <div className="flex items-center justify-between gap-2">
            {capture.capture_date ? (
              <p className="text-white/55 text-[11px] leading-none">
                {formatDate(capture.capture_date)}
              </p>
            ) : <span />}
            <p className="text-white/40 text-[10px] uppercase tracking-wider leading-none flex-shrink-0">
              {formatBytes(capture.size_bytes || 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CaptureListRow ────────────────────────────────────────────────────────────

function CaptureListRow({
  capture, isDeleting, onClick, onEdit, onDelete, onShare,
}: {
  capture: Capture
  isDeleting: boolean
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onShare: () => Promise<boolean>
}) {
  const [imgError, setImgError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [justCopied, setJustCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { icon: Icon, color, label } = getTypeConfig(capture.type)

  const handleShareClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (justCopied) return
    const ok = await onShare()
    if (ok) {
      setJustCopied(true)
      setTimeout(() => setJustCopied(false), 2000)
    }
  }, [onShare, justCopied])

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
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 cursor-pointer transition-all duration-200 ${
        isDeleting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      } ${menuOpen ? 'z-10 relative' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
      {/* Thumbnail */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center">
            <Cloud className="w-4 h-4 text-zinc-600" />
          </div>
        ) : (
          <img
            src={capture.cloud_url}
            alt={capture.title}
            className="w-full h-full object-cover"
            draggable={false}
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">
          {capture.title || 'Untitled Capture'}
        </p>
      </div>

      {/* Type badge */}
      <div className="hidden sm:flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex-shrink-0">
        <Icon className="w-2.5 h-2.5 flex-shrink-0" style={{ color }} />
        {label}
      </div>

      {/* Date */}
      <span className="hidden md:block text-xs text-slate-500 dark:text-zinc-500 w-24 flex-shrink-0 text-right">
        {capture.capture_date ? formatDate(capture.capture_date) : '—'}
      </span>

      {/* File size */}
      <span className="hidden lg:block text-xs text-slate-500 dark:text-zinc-500 w-16 flex-shrink-0 text-right tabular-nums">
        {formatBytes(capture.size_bytes ?? 0)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button
          onClick={handleShareClick}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            justCopied
              ? 'bg-emerald-500/15 text-emerald-500'
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
          }`}
          aria-label={justCopied ? 'Link copied' : 'Copy share link'}
        >
          {justCopied ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Share2 className="w-3.5 h-3.5" />}
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
            aria-label="Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute top-8 right-0 w-40 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
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
          className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:border-slate-400 dark:focus:border-slate-500 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-zinc-100 text-sm outline-none transition-colors mb-5"
        />
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (value.trim()) onSave(value.trim()) }}
            disabled={!value.trim()}
            className="flex-1 py-2.5 rounded-xl bg-slate-500 hover:bg-slate-400 active:bg-slate-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MoveToCapsuleModal ────────────────────────────────────────────────────────

function MoveToCapsuleModal({
  selectedCount, profileId, excludeCapsuleId, targetCapsuleId, newCapsuleName,
  onSelectTarget, onChangeNewName, onConfirm, onCancel,
}: {
  selectedCount: number
  profileId: string | null
  excludeCapsuleId: string
  targetCapsuleId: string | null
  newCapsuleName: string
  onSelectTarget: (id: string) => void
  onChangeNewName: (name: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const [otherCapsules, setOtherCapsules] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (!profileId) return
    supabase
      .from('capsules')
      .select('id, name')
      .eq('profile_id', profileId)
      .neq('id', excludeCapsuleId)
      .then(({ data }) => setOtherCapsules(data ?? []))
  }, [profileId, excludeCapsuleId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const canConfirm = !!targetCapsuleId || newCapsuleName.trim().length > 0

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-zinc-100 text-base">
            Move {selectedCount} Capture{selectedCount !== 1 ? 's' : ''}
          </h3>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Existing capsules */}
        <div className="space-y-1.5 mb-4">
          {otherCapsules.length === 0 && (
            <p className="text-xs text-zinc-500 px-1">No other capsules yet — create one below.</p>
          )}
          {otherCapsules.map(c => (
            <button
              key={c.id}
              onClick={() => onSelectTarget(c.id)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-left border transition-colors ${
                targetCapsuleId === c.id
                  ? 'bg-blue-500/15 border-blue-500/50 text-blue-300'
                  : 'bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
              {c.name}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[11px] font-semibold text-zinc-500 tracking-wider">OR</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* New capsule name */}
        <input
          type="text"
          value={newCapsuleName}
          onChange={e => onChangeNewName(e.target.value)}
          placeholder="Create a new capsule…"
          maxLength={60}
          className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-xl px-3.5 py-2.5 text-zinc-100 placeholder-zinc-500 text-sm outline-none transition-colors mb-5"
        />

        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 active:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            Confirm Move
          </button>
        </div>
      </div>
    </div>
  )
}

// ── BulkDeleteModal ───────────────────────────────────────────────────────────

function BulkDeleteModal({
  selectedCount, onConfirm, onCancel,
}: {
  selectedCount: number
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-950/60 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="font-bold text-zinc-100 text-base leading-snug">
            Delete {selectedCount} Capture{selectedCount !== 1 ? 's' : ''}?
          </h3>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed mb-5">
          This action cannot be undone. Are you sure you want to permanently delete these memories?
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            Delete Permanently
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
        <div className="absolute inset-0 rounded-full bg-slate-400/15 dark:bg-slate-400/10 blur-3xl scale-150" />
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-950/60 dark:to-slate-800/40 border border-slate-200/80 dark:border-slate-800/40 flex items-center justify-center shadow-inner">
          <Camera className="w-11 h-11 text-slate-500 dark:text-slate-400" />
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
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-500 hover:bg-slate-400 active:bg-slate-600 text-white text-sm font-semibold transition-colors shadow-md shadow-slate-500/25"
      >
        <Camera className="w-4 h-4" />
        Scan your first memory
      </button>

      {/* Capture type pills */}
      <div className="mt-8 flex items-center gap-2 flex-wrap justify-center">
        {(Object.entries(TYPE_CONFIG) as [CaptureType, typeof TYPE_CONFIG[CaptureType]][]).map(
          ([type, { icon: Icon, color, label }]) => (
            <div
              key={type}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border"
              style={{ background: `${color}18`, borderColor: `${color}45`, color }}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CapsuleGalleryPage() {
  const router = useRouter()
  const { id: capsuleId } = useParams<{ id: string }>()

  const [capsule,         setCapsule]         = useState<Capsule | null>(null)
  const [profileId,       setProfileId]       = useState<string | null>(null)
  const [captures,        setCaptures]        = useState<Capture[]>([])
  const [storageLimitBytes, setStorageLimitBytes] = useState<number | null>(null)
  const [usedBytes,         setUsedBytes]         = useState(0)
  const [loading,         setLoading]         = useState(true)
  const [notFound,        setNotFound]        = useState(false)
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null)
  const [showCaptureFlow, setShowCaptureFlow] = useState(false)
  const [editTarget,      setEditTarget]      = useState<Capture | null>(null)
  const [deleteTarget,    setDeleteTarget]    = useState<Capture | null>(null)
  const [deletingIds,     setDeletingIds]     = useState<Set<string>>(new Set())
  const [sortBy,          setSortBy]          = useState<'date' | 'name'>('date')
  const [sortDir,         setSortDir]         = useState<'desc' | 'asc'>('desc')
  const [filterType,      setFilterType]      = useState<CaptureType | null>(null)
  const [viewMode,        setViewMode]        = useState<'grid' | 'list'>('grid')

  // ── Selection mode (bulk actions) ──────────────────────────────────────────
  const [isSelectMode,       setIsSelectMode]       = useState(false)
  const [selectedCaptureIds, setSelectedCaptureIds] = useState<string[]>([])

  // ── Storage Gate (mock volumetric check — mirrors dashboard header meter) ──
  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024
  const mockUsedBytes = 1.5 * 1024 * 1024 * 1024 // SET TO 2.0 GB TO TRIGGER THE GATE
  const isStorageFull = mockUsedBytes >= STORAGE_LIMIT_BYTES

  const handleRequestNewCapture = useCallback(() => {
    if (isStorageFull) {
      setUpgradeModalOpen(true)
      return
    }
    setShowCaptureFlow(true)
  }, [isStorageFull])

  const handleToggleSelectMode = useCallback(() => {
    setIsSelectMode(prev => {
      const next = !prev
      if (!next) setSelectedCaptureIds([])
      return next
    })
  }, [])

  const handleToggleCaptureSelected = useCallback((id: string) => {
    setSelectedCaptureIds(prev =>
      prev.includes(id) ? prev.filter(existingId => existingId !== id) : [...prev, id]
    )
  }, [])

  // ── Move-to-capsule modal ──────────────────────────────────────────────────
  const [isCapsuleModalOpen, setIsCapsuleModalOpen] = useState(false)
  const [targetCapsuleId,    setTargetCapsuleId]    = useState<string | null>(null)
  const [newCapsuleName,     setNewCapsuleName]     = useState('')

  const handleCloseCapsuleModal = useCallback(() => {
    setIsCapsuleModalOpen(false)
    setTargetCapsuleId(null)
    setNewCapsuleName('')
  }, [])

  // ── Bulk delete confirmation modal ────────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)


  const availableTypes = useMemo(() =>
    (Object.keys(TYPE_CONFIG) as CaptureType[]).filter(t => captures.some(c => c.type === t)),
  [captures])

  const sortedCaptures = useMemo(() => {
    if (sortBy === 'name') {
      return [...captures].sort((a, b) => sortDir === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title))
    }
    const diff = (a: Capture, b: Capture) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return [...captures].sort((a, b) => sortDir === 'desc' ? diff(a, b) : -diff(a, b))
  }, [captures, sortBy, sortDir])

  const displayedCaptures = useMemo(() =>
    filterType ? sortedCaptures.filter(c => c.type === filterType) : sortedCaptures,
  [sortedCaptures, filterType])

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

  // Profile's storage_limit_bytes and total usage across all of the user's captures
  // (not just this capsule's) — mirrors the dashboard header's VolumetricMeter.
  const fetchStorageStats = useCallback(async (uid: string) => {
    const [{ data: profileData }, { data: capsuleRows }] = await Promise.all([
      supabase.from('profiles').select('storage_limit_bytes').eq('id', uid).single(),
      supabase.from('capsules').select('id').eq('profile_id', uid),
    ])

    setStorageLimitBytes(profileData?.storage_limit_bytes ?? 0)

    const ids = capsuleRows?.map(c => c.id) ?? []
    if (ids.length === 0) { setUsedBytes(0); return }

    const { data: countRows } = await supabase
      .from('captures')
      .select('size_bytes')
      .in('capsule_id', ids)

    const total = countRows?.reduce((acc, curr) => acc + (curr.size_bytes || 0), 0) ?? 0
    setUsedBytes(total)
  }, [])

  // ── Auth guard ────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setProfileId(session.user.id)
      fetchData(session.user.id)
      fetchStorageStats(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router, fetchData, fetchStorageStats])

  // ── Bulk move captures to a capsule (existing or newly created) ──────────

  const handleMoveCaptures = useCallback(async () => {
    if (selectedCaptureIds.length === 0) return

    try {
      let finalCapsuleId = targetCapsuleId

      if (!finalCapsuleId && newCapsuleName.trim()) {
        const { data, error } = await supabase
          .from('capsules')
          .insert({ profile_id: profileId, name: newCapsuleName.trim() })
          .select('id')
          .single()
        if (error) throw error
        finalCapsuleId = data.id
      }

      if (!finalCapsuleId) return

      const { error: moveError } = await supabase
        .from('captures')
        .update({ capsule_id: finalCapsuleId })
        .in('id', selectedCaptureIds)
      if (moveError) throw moveError

      setCaptures(prev => prev.filter(c => !selectedCaptureIds.includes(c.id)))
      setSelectedCaptureIds([])
      handleCloseCapsuleModal()
    } catch (error) {
      console.error('MOVE CAPTURES ERROR:', error)
      handleCloseCapsuleModal()
    }
  }, [selectedCaptureIds, targetCapsuleId, newCapsuleName, profileId, handleCloseCapsuleModal])

  // ── Bulk delete selected captures ─────────────────────────────────────────

  const handleBulkDelete = useCallback(async () => {
    if (selectedCaptureIds.length === 0) return

    try {
      const { error } = await supabase
        .from('captures')
        .delete()
        .in('id', selectedCaptureIds)
      if (error) throw error

      setCaptures(prev => prev.filter(c => !selectedCaptureIds.includes(c.id)))
      setSelectedCaptureIds([])
      setIsDeleteModalOpen(false)
    } catch (error) {
      console.error('BULK DELETE ERROR:', error)
      setIsDeleteModalOpen(false)
    }
  }, [selectedCaptureIds])

  // ── Share capture (public link toggle + copy) ─────────────────────────────

  const handleShareCapture = useCallback(async (
    captureId: string,
    currentShareId: string | null | undefined,
    currentIsPublic: boolean | null | undefined,
  ): Promise<boolean> => {
    try {
      if (currentIsPublic && currentShareId) {
        const url = `${window.location.origin}/shared/${currentShareId}`
        await navigator.clipboard.writeText(url)
        return true
      }

      const { data, error } = await supabase
        .from('captures')
        .update({ is_public: true })
        .eq('id', captureId)
        .select('share_id')
        .single()

      if (error || !data) throw error

      setCaptures(prev => prev.map(c =>
        c.id === captureId ? { ...c, is_public: true, share_id: data.share_id } : c
      ))

      const url = `${window.location.origin}/shared/${data.share_id}`
      await navigator.clipboard.writeText(url)
      return true
    } catch (error) {
      console.error('SHARE CAPTURE ERROR:', error)
      return false
    }
  }, [])

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

  // ── Viewer rename / delete (from within the open viewer) ─────────────────

  const handleViewerRename = useCallback(async (id: string, title: string) => {
    setCaptures(prev => prev.map(c => c.id === id ? { ...c, title } : c))
    const { error } = await supabase.from('captures').update({ title }).eq('id', id)
    if (error) console.error('RENAME ERROR:', error)
  }, [])

  const handleViewerDelete = useCallback(async (id: string) => {
    setSelectedCapture(null)
    setDeletingIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      setCaptures(prev => prev.filter(c => c.id !== id))
      setDeletingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }, 300)
    const { error } = await supabase.from('captures').delete().eq('id', id)
    if (error) console.error('DELETE ERROR:', error)
  }, [])

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
            className="text-slate-500 hover:text-slate-400 text-sm font-medium transition-colors"
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

          {/* Back to Dashboard — CubbyHole brand link */}
          <BrandLink showBack />

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
            {!loading && captures.length > 0 && (
              <button
                onClick={handleToggleSelectMode}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  isSelectMode
                    ? 'bg-slate-500 hover:bg-slate-400 border-slate-400 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                }`}
              >
                {isSelectMode ? 'Done' : 'Select'}
              </button>
            )}
            <VolumetricMeter usedBytes={usedBytes} limitBytes={storageLimitBytes} />
            <ThemeToggle />
            {!loading && (
              <button
                onClick={handleRequestNewCapture}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold transition-opacity hover:opacity-90 active:opacity-75 flex-shrink-0 shadow-sm"
                style={{
                  background: accent,
                  boxShadow: `0 2px 8px ${accent}40`,
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                add memory
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Count line + sort toggle */}
        {!loading && (
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="text-sm text-slate-500 dark:text-zinc-500">
              {captures.length === 0
                ? 'No memories yet'
                : filterType
                  ? `${displayedCaptures.length} of ${captures.length} memor${captures.length !== 1 ? 'ies' : 'y'}`
                  : `${captures.length} memor${captures.length !== 1 ? 'ies' : 'y'}`}
            </p>

            {captures.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Grid/List view toggle */}
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                    className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'text-white shadow-sm'
                        : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                    }`}
                    style={viewMode === 'grid' ? { background: accent } : undefined}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    aria-label="List view"
                    className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                      viewMode === 'list'
                        ? 'text-white shadow-sm'
                        : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                    }`}
                    style={viewMode === 'list' ? { background: accent } : undefined}
                  >
                    <ListIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

              <div className="flex items-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5 text-xs font-medium flex-shrink-0">
                {/* Date button — re-clicking toggles asc/desc */}
                <button
                  onClick={() => {
                    if (sortBy === 'date') setSortDir(d => d === 'desc' ? 'asc' : 'desc')
                    else setSortBy('date')
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                    sortBy === 'date'
                      ? 'text-white shadow-sm'
                      : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                  }`}
                  style={sortBy === 'date' ? { background: accent } : undefined}
                >
                  date
                  {sortBy === 'date' && (
                    sortDir === 'desc'
                      ? <ArrowDown className="w-3 h-3" />
                      : <ArrowUp className="w-3 h-3" />
                  )}
                </button>

                {/* Name button — re-clicking toggles asc/desc */}
                <button
                  onClick={() => {
                    if (sortBy === 'name') setSortDir(d => d === 'desc' ? 'asc' : 'desc')
                    else setSortBy('name')
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                    sortBy === 'name'
                      ? 'text-white shadow-sm'
                      : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                  }`}
                  style={sortBy === 'name' ? { background: accent } : undefined}
                >
                  name
                  {sortBy === 'name' && (
                    sortDir === 'desc'
                      ? <ArrowDown className="w-3 h-3" />
                      : <ArrowUp className="w-3 h-3" />
                  )}
                </button>
              </div>
              </div>
            )}
          </div>
        )}

        {/* Type filter chips — only shown when 2+ types exist */}
        {!loading && availableTypes.length >= 2 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <button
              onClick={() => setFilterType(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filterType === null
                  ? 'text-white border-transparent'
                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
              style={filterType === null ? { background: accent, borderColor: accent } : undefined}
            >
              All
            </button>
            {availableTypes.map(type => {
              const { icon: Icon, label } = TYPE_CONFIG[type]
              const active = filterType === type
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(active ? null : type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    active
                      ? 'text-white border-transparent'
                      : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
                  }`}
                  style={active ? { background: accent, borderColor: accent } : undefined}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              )
            })}
          </div>
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
              onAddMemory={handleRequestNewCapture}
            />
          </div>
        ) : displayedCaptures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-slate-500 dark:text-zinc-500 mb-3">
              No {filterType && TYPE_CONFIG[filterType]?.label} captures in this capsule.
            </p>
            <button
              onClick={() => setFilterType(null)}
              className="text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: accent }}
            >
              Clear filter
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedCaptures.map(capture => (
              <CaptureCard
                key={capture.id}
                capture={capture}
                isDeleting={deletingIds.has(capture.id)}
                isSelectMode={isSelectMode}
                isSelected={selectedCaptureIds.includes(capture.id)}
                onClick={() => {
                  if (isSelectMode) {
                    handleToggleCaptureSelected(capture.id)
                  } else {
                    setSelectedCapture(capture)
                  }
                }}
                onEdit={() => setEditTarget(capture)}
                onDelete={() => setDeleteTarget(capture)}
                onShare={() => handleShareCapture(capture.id, capture.share_id, capture.is_public)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayedCaptures.map(capture => (
              <CaptureListRow
                key={capture.id}
                capture={capture}
                isDeleting={deletingIds.has(capture.id)}
                onClick={() => setSelectedCapture(capture)}
                onEdit={() => setEditTarget(capture)}
                onDelete={() => setDeleteTarget(capture)}
                onShare={() => handleShareCapture(capture.id, capture.share_id, capture.is_public)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Mobile FAB (only when there are captures — empty state has its own CTA) ── */}
      {!loading && captures.length > 0 && (
        <div className="sm:hidden fixed bottom-6 right-5 z-30">
          <button
            onClick={handleRequestNewCapture}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl text-white text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-75"
            style={{
              background: accent,
              boxShadow: `0 8px 24px ${accent}45`,
            }}
          >
            <Plus className="w-5 h-5" />
            add memory
          </button>
        </div>
      )}

      {/* ── Bulk action bar — appears while items are checked in Select mode ── */}
      {selectedCaptureIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white/90">
              {selectedCaptureIds.length} selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCapsuleModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Move to Capsule
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-500/90 hover:bg-red-500 text-white transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Capture viewer (spin / lenticular / document / 2D) ── */}
      {selectedCapture && (
        <CaptureViewerModal
          capture={toViewable(selectedCapture)}
          onClose={() => setSelectedCapture(null)}
          onRename={handleViewerRename}
          onDelete={handleViewerDelete}
          onShare={() => handleShareCapture(selectedCapture.id, selectedCapture.share_id, selectedCapture.is_public)}
        />
      )}

      {/* ── Move to capsule modal ── */}
      {isCapsuleModalOpen && (
        <MoveToCapsuleModal
          selectedCount={selectedCaptureIds.length}
          profileId={profileId}
          excludeCapsuleId={capsuleId}
          targetCapsuleId={targetCapsuleId}
          newCapsuleName={newCapsuleName}
          onSelectTarget={id => { setTargetCapsuleId(id); setNewCapsuleName('') }}
          onChangeNewName={name => { setNewCapsuleName(name); setTargetCapsuleId(null) }}
          onConfirm={handleMoveCaptures}
          onCancel={handleCloseCapsuleModal}
        />
      )}

      {/* ── Bulk delete confirmation modal ── */}
      {isDeleteModalOpen && (
        <BulkDeleteModal
          selectedCount={selectedCaptureIds.length}
          onConfirm={handleBulkDelete}
          onCancel={() => setIsDeleteModalOpen(false)}
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

      {/* ── Storage Gate: blocks new captures before the camera ever opens ── */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-[90%] max-w-sm rounded-2xl bg-zinc-900 border border-amber-500/30 shadow-2xl shadow-amber-500/10 p-6">
            <h2 className="text-lg font-bold text-white mb-2">Storage Limit Reached</h2>
            <p className="text-sm text-white/65 leading-relaxed mb-6">
              You have used your 2.0 GB of free spatial storage. Upgrade to CubbyHole Pro to unlock unlimited 3D Objects, Reliefs, and high-res archiving.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setUpgradeModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={() => console.log('Initiate Stripe Checkout')}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-colors shadow-sm"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
