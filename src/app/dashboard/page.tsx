'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FolderOpen, LogOut, X, Check, Loader2, MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown, Palette, Sparkles, LayoutGrid, List as ListIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ui/ThemeToggle'
import BrandLink from '@/components/ui/BrandLink'
import CubbyShelfIcon from '@/components/ui/CubbyShelfIcon'
import VolumetricMeter from '@/components/dashboard/VolumetricMeter'
import CaptureFlow from '@/components/capture/CaptureFlow'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Capsule {
  id: string
  profile_id: string
  name: string
  theme_color: string | null
  created_at: string
}

// ── Color swatches ────────────────────────────────────────────────────────────

const SWATCHES = [
  { label: 'Red',    hex: '#f87171' },
  { label: 'Sky',    hex: '#38bdf8' },
  { label: 'Yellow', hex: '#fef08a' },
  { label: 'Green',  hex: '#86efac' },
  { label: 'Violet', hex: '#a78bfa' },
]

const DEFAULT_COLOR = SWATCHES[0].hex

function resolveColor(hex: string | null): string {
  return hex ?? DEFAULT_COLOR
}

// ── CapsuleCard ───────────────────────────────────────────────────────────────

function CapsuleCard({
  capsule, captureCount = 0, viewMode = 'grid', onClick, onRename, onChangeColor, onDelete,
}: {
  capsule: Capsule
  captureCount?: number
  viewMode?: 'grid' | 'list'
  onClick: () => void
  onRename: () => void
  onChangeColor: () => void
  onDelete: () => void
}) {
  const color = resolveColor(capsule.theme_color)
  const dateStr = new Date(capsule.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  if (viewMode === 'list') {
    return (
      <div
        className={`group relative flex items-center gap-3 w-full rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/40 transition-all duration-300 px-3 py-2.5 cursor-pointer ${menuOpen ? 'z-10 relative' : ''}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      >
        <div
          className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: `${color}14` }}
        >
          <CubbyShelfIcon color={color} className="w-5 h-7" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate leading-snug">
            {capsule.name}
          </p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Created {dateStr}</p>
        </div>

        <div
          className="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums leading-none flex items-center"
          style={{ background: `${color}25`, border: `1px solid ${color}45`, color }}
        >
          {captureCount}
        </div>

        <div
          ref={menuRef}
          className="relative flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
            aria-label="Capsule options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute top-8 right-0 w-40 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-20">
              <button
                onClick={() => { setMenuOpen(false); onRename() }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                Rename
              </button>
              <div className="border-t border-slate-100 dark:border-zinc-800" />
              <button
                onClick={() => { setMenuOpen(false); onChangeColor() }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <Palette className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                Change Colour
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
    )
  }

  return (
    <div
      className={`group relative w-full rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-xl hover:shadow-black/8 dark:hover:shadow-black/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden cursor-pointer ${menuOpen ? 'z-10 relative' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
      {/* Coloured band + folder icon */}
      <div
        className="relative h-32 flex items-center justify-center"
        style={{ background: `${color}14` }}
      >
        {/* Cubby shelf icon */}
        <div className="relative z-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <CubbyShelfIcon color={color} className="w-[52px] h-[77px] transition-colors duration-300" />
        </div>

        {/* Capture count badge — top left */}
        <div
          className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums leading-none flex items-center"
          style={{ background: `${color}25`, border: `1px solid ${color}45`, color }}
        >
          {captureCount}
        </div>

        {/* Ellipsis menu — top right */}
        <div
          ref={menuRef}
          className="absolute top-2 right-2 z-20"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-7 h-7 rounded-lg bg-white/60 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-900 backdrop-blur-sm border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Capsule options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute top-8 right-0 w-40 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onRename() }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                Rename
              </button>
              <div className="border-t border-slate-100 dark:border-zinc-800" />
              <button
                onClick={() => { setMenuOpen(false); onChangeColor() }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <Palette className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                Change Colour
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

      {/* Footer */}
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate leading-snug mb-0.5">
          {capsule.name}
        </p>
        <p className="text-xs text-slate-400 dark:text-zinc-500">Created {dateStr}</p>
      </div>
    </div>
  )
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 animate-pulse">
      <div className="h-32 bg-slate-100 dark:bg-zinc-800" />
      <div className="px-4 py-3 space-y-2">
        <div className="h-3 w-28 bg-slate-100 dark:bg-zinc-800 rounded-full" />
        <div className="h-2.5 w-16 bg-slate-100 dark:bg-zinc-800 rounded-full" />
      </div>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-slate-400/15 dark:bg-slate-400/10 blur-3xl scale-150" />
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-950/60 dark:to-slate-800/40 border border-slate-200/80 dark:border-slate-800/40 flex items-center justify-center shadow-inner">
          <FolderOpen className="w-11 h-11 text-slate-500 dark:text-slate-400" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 dark:text-zinc-100 mb-2 tracking-tight">
        No capsules yet
      </h3>
      <p className="text-sm text-slate-500 dark:text-zinc-500 max-w-xs leading-relaxed mb-7">
        A <span className="font-medium text-slate-700 dark:text-zinc-300">capsule</span> is a
        named collection for one child or theme — like &ldquo;Leo&rsquo;s Kindergarten
        Art&rdquo; or &ldquo;Family Road Trip 2025&rdquo;. Create one to start capturing
        memories.
      </p>

      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-500 hover:bg-slate-400 active:bg-slate-600 text-white text-sm font-semibold transition-colors shadow-md shadow-slate-500/25"
      >
        <Plus className="w-4 h-4" />
        Create your first capsule
      </button>
    </div>
  )
}

// ── CreateCapsuleModal ────────────────────────────────────────────────────────

interface ModalProps {
  profileId: string
  onClose: () => void
  onCreated: (capsule: Capsule) => void
}

function CreateCapsuleModal({ profileId, onClose, onCreated }: ModalProps) {
  const [name,          setName]          = useState('')
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return setError('Please give this capsule a name.')

    setLoading(true)
    setError(null)

    const { data, error: sbError } = await supabase
      .from('capsules')
      .insert({ profile_id: profileId, name: trimmed, theme_color: selectedColor })
      .select()
      .single()

    setLoading(false)

    if (sbError) {
      setError(sbError.message)
    } else {
      onCreated(data as Capsule)
      onClose()
    }
  }

  const labelClass =
    'block text-slate-500 dark:text-zinc-400 text-xs font-medium mb-1.5 tracking-wider uppercase'
  const inputClass =
    'w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:border-slate-500/70 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 text-sm outline-none transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet — slides up from bottom on mobile, centred on desktop */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-950 sm:rounded-2xl rounded-t-2xl border-t border-x border-slate-200 dark:border-zinc-800 sm:border shadow-2xl">

        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 sm:pt-5 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
              style={{ background: `${selectedColor}20`, border: `1.5px solid ${selectedColor}45` }}
            >
              <FolderOpen className="w-4 h-4" style={{ color: selectedColor }} />
            </div>
            <h2 className="font-bold text-slate-900 dark:text-zinc-100 text-base">New Capsule</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">

          {/* Name field */}
          <div>
            <label className={labelClass}>
              Name <span className="text-slate-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="e.g. Leo's Kindergarten Art"
              maxLength={60}
              className={inputClass}
            />
          </div>

          {/* Colour picker */}
          <div>
            <label className={labelClass}>Colour</label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {SWATCHES.map(({ hex, label }) => (
                <button
                  key={hex}
                  onClick={() => setSelectedColor(hex)}
                  title={label}
                  className="relative w-9 h-9 rounded-full transition-transform duration-150 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 shadow-sm"
                  style={{ background: hex }}
                  aria-label={label}
                  aria-pressed={selectedColor === hex}
                >
                  {selectedColor === hex && (
                    <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Error toast */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 sm:pb-5 flex gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            style={{
              background: loading || !name.trim() ? '#9ca3af' : selectedColor,
              boxShadow: !loading && name.trim() ? `0 2px 12px ${selectedColor}40` : undefined,
            }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              : <><Check  className="w-4 h-4" />              Create Capsule</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── RenameCapsuleModal ────────────────────────────────────────────────────────

function RenameCapsuleModal({
  capsule, onSave, onCancel,
}: {
  capsule: Capsule
  onSave: (name: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(capsule.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Rename Capsule</h2>
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
          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:border-slate-500/70 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white text-sm outline-none transition-colors mb-5"
        />
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (value.trim()) onSave(value.trim()) }}
            disabled={!value.trim()}
            className="flex-1 py-3 rounded-xl bg-slate-500 hover:bg-slate-400 active:bg-slate-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ChangeColorModal ──────────────────────────────────────────────────────────

function ChangeColorModal({
  capsule, onSave, onCancel,
}: {
  capsule: Capsule
  onSave: (hex: string) => void
  onCancel: () => void
}) {
  const [selectedColor, setSelectedColor] = useState(resolveColor(capsule.theme_color))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Change Colour</h2>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap mb-5">
          {SWATCHES.map(({ hex, label }) => (
            <button
              key={hex}
              onClick={() => setSelectedColor(hex)}
              title={label}
              className="relative w-9 h-9 rounded-full transition-transform duration-150 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 shadow-sm"
              style={{ background: hex }}
              aria-label={label}
              aria-pressed={selectedColor === hex}
            >
              {selectedColor === hex && (
                <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow-sm" />
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(selectedColor)}
            className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-colors shadow-sm"
            style={{ background: selectedColor, boxShadow: `0 2px 12px ${selectedColor}40` }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DeleteCapsuleModal ────────────────────────────────────────────────────────

function DeleteCapsuleModal({
  capsule, onConfirm, onCancel,
}: {
  capsule: Capsule
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base leading-snug">Delete capsule?</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5 truncate">{capsule.name}</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed mb-5">
          This will permanently delete the capsule and all its memories. This cannot be undone.
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()

  const [userId,            setUserId]            = useState<string | null>(null)
  const [storageLimitBytes, setStorageLimitBytes] = useState<number | null>(null)
  const [capsules,          setCapsules]          = useState<Capsule[]>([])
  const [captureCounts,     setCaptureCounts]     = useState<Record<string, number>>({})
  const [usedBytes,         setUsedBytes]         = useState(0)
  const [sortBy,            setSortBy]            = useState<'date' | 'name'>('date')
  const [sortDir,           setSortDir]           = useState<'desc' | 'asc'>('desc')
  const [viewMode,          setViewMode]          = useState<'grid' | 'list'>('grid')
  const [loading,           setLoading]           = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [renameTarget,      setRenameTarget]      = useState<Capsule | null>(null)
  const [colorTarget,       setColorTarget]       = useState<Capsule | null>(null)
  const [deleteTarget,      setDeleteTarget]      = useState<Capsule | null>(null)
  const [showCaptureFlow,   setShowCaptureFlow]   = useState(false)

  const sortedCapsules = useMemo(() => {
    if (sortBy === 'name') {
      return [...capsules].sort((a, b) => sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
    }
    const diff = (a: Capsule, b: Capsule) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return [...capsules].sort((a, b) => sortDir === 'desc' ? diff(a, b) : -diff(a, b))
  }, [capsules, sortBy, sortDir])

  // ── Auth guard + data fetch ───────────────────────────────────────────────

  const fetchCapsules = useCallback(async (uid: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('capsules')
      .select('*')
      .eq('profile_id', uid)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const rows = data as Capsule[]
      setCapsules(rows)

      // Fetch capture counts for all capsules in one query
      if (rows.length > 0) {
        const ids = rows.map(c => c.id)
        const { data: countRows } = await supabase
          .from('captures')
          .select('capsule_id, size_bytes')
          .in('capsule_id', ids)

        const counts: Record<string, number> = {}
        ids.forEach(id => { counts[id] = 0 })
        countRows?.forEach(r => { counts[r.capsule_id] = (counts[r.capsule_id] ?? 0) + 1 })
        setCaptureCounts(counts)

        const total = countRows?.reduce((acc, curr) => acc + (curr.size_bytes || 0), 0) ?? 0
        setUsedBytes(total)
      }
    }
    setLoading(false)
  }, [])

  // Profile's storage_limit_bytes is granted via access-code redemption (see
  // access_codes_schema.sql / /api/verify-code) — independent of the capsule fetch.
  const fetchStorageLimit = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('storage_limit_bytes')
      .eq('id', uid)
      .single()

    setStorageLimitBytes(data?.storage_limit_bytes ?? 0)
  }, [])

  useEffect(() => {
    // Middleware already guarantees an authenticated session for this route —
    // just read the user id, no redirect-on-mount (that caused the login flash).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setUserId(session.user.id)
      fetchCapsules(session.user.id)
      fetchStorageLimit(session.user.id)
    })

    // Also react to auth state changes (e.g. session expiry or sign-out from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router, fetchCapsules, fetchStorageLimit])

  // ── Optimistic insert ─────────────────────────────────────────────────────

  const handleCreated = useCallback((capsule: Capsule) => {
    setCapsules(prev => [capsule, ...prev])
    setCaptureCounts(prev => ({ ...prev, [capsule.id]: 0 }))
  }, [])

  // ── Rename capsule ────────────────────────────────────────────────────────

  const handleRenameSave = useCallback(async (name: string) => {
    if (!renameTarget) return
    const id = renameTarget.id
    setRenameTarget(null)
    setCapsules(prev => prev.map(c => c.id === id ? { ...c, name } : c))
    const { error } = await supabase.from('capsules').update({ name }).eq('id', id)
    if (error) console.error('RENAME ERROR:', error)
  }, [renameTarget])

  // ── Change capsule colour ─────────────────────────────────────────────────

  const handleColorSave = useCallback(async (theme_color: string) => {
    if (!colorTarget) return
    const id = colorTarget.id
    setColorTarget(null)
    setCapsules(prev => prev.map(c => c.id === id ? { ...c, theme_color } : c))
    const { error } = await supabase.from('capsules').update({ theme_color }).eq('id', id)
    if (error) console.error('COLOUR ERROR:', error)
  }, [colorTarget])

  // ── Delete capsule ────────────────────────────────────────────────────────

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleteTarget(null)
    setCapsules(prev => prev.filter(c => c.id !== id))
    const { error } = await supabase.from('capsules').delete().eq('id', id)
    if (error) {
      console.error('DELETE ERROR:', error)
      alert('Delete failed: ' + error.message)
    }
  }, [deleteTarget])

  // ── Sign out ──────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // ── Global "+ Add Memory" — targets the most recently created capsule.
  // Capsules with no destination to save into get routed to capsule creation
  // first, mirroring the in-capsule storage gate's "nowhere to save" guard. ──

  useEffect(() => {
    document.body.style.overflow = showCaptureFlow ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showCaptureFlow])

  const handleRequestNewCapture = useCallback(() => {
    if (capsules.length === 0) {
      setIsCreateModalOpen(true)
      return
    }
    setShowCaptureFlow(true)
  }, [capsules])

  const handleCaptureComplete = useCallback(() => {
    setShowCaptureFlow(false)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchCapsules(session.user.id)
    })
  }, [fetchCapsules])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-200">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-900 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Brand */}
          <BrandLink />

          {/* Right controls */}
          <div className="flex items-center gap-3">
            <VolumetricMeter usedBytes={usedBytes} limitBytes={storageLimitBytes} />
            <button
              onClick={() => console.log('Upgrade clicked')}
              className="flex items-center gap-1 sm:gap-1.5 text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 px-2 sm:px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="sm:hidden flex flex-col items-start leading-[1.1] text-[9px] font-bold">
                <span>upgrade</span>
                <span>to pro</span>
              </span>
              <span className="hidden sm:inline text-xs font-semibold">upgrade to pro</span>
            </button>
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-zinc-300 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Page heading */}
        <h1 className="text-2xl font-medium tracking-tight text-slate-500 dark:text-zinc-400 mb-4">
          cubbyhole gallery
        </h1>

        {/* Sort toggle + desktop CTA — only shown when there are existing capsules */}
        {!loading && capsules.length > 0 && (
          <div className="flex items-center justify-end gap-2 mb-8">
            {/* Grid/List view toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-slate-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-slate-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sort toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5 text-xs font-medium">
              {/* Date button — re-clicking toggles asc/desc */}
              <button
                onClick={() => {
                  if (sortBy === 'date') setSortDir(d => d === 'desc' ? 'asc' : 'desc')
                  else setSortBy('date')
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                  sortBy === 'date'
                    ? 'bg-slate-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                }`}
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
                    ? 'bg-slate-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                }`}
              >
                name
                {sortBy === 'name' && (
                  sortDir === 'desc'
                    ? <ArrowDown className="w-3 h-3" />
                    : <ArrowUp className="w-3 h-3" />
                )}
              </button>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-500 hover:bg-slate-400 active:bg-slate-600 text-white text-xs font-semibold transition-colors shadow-sm shadow-slate-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              new cubbyhole
            </button>

            <button
              onClick={handleRequestNewCapture}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white text-xs font-semibold transition-colors shadow-sm shadow-indigo-500/30"
            >
              <Plus className="w-3.5 h-3.5" />
              add memory
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : capsules.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
            <EmptyState onCreateClick={() => setIsCreateModalOpen(true)} />
          </div>
        ) : (
          <div className={viewMode === 'list' ? 'flex flex-col gap-2.5' : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'}>
            {sortedCapsules.map(capsule => (
              <CapsuleCard
                key={capsule.id}
                capsule={capsule}
                captureCount={captureCounts[capsule.id] ?? 0}
                viewMode={viewMode}
                onClick={() => router.push(`/dashboard/${capsule.id}`)}
                onRename={() => setRenameTarget(capsule)}
                onChangeColor={() => setColorTarget(capsule)}
                onDelete={() => setDeleteTarget(capsule)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── FABs (mobile only, when capsules exist) ── */}
      {!loading && capsules.length > 0 && (
        <div className="sm:hidden fixed bottom-6 right-5 z-30 flex flex-col items-end gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-500 hover:bg-slate-400 active:bg-slate-600 text-white text-sm font-semibold shadow-xl shadow-slate-500/35 transition-colors"
          >
            <Plus className="w-5 h-5" />
            new cubbyhole
          </button>
          <button
            onClick={handleRequestNewCapture}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white text-sm font-semibold shadow-xl shadow-indigo-500/35 transition-colors"
          >
            <Plus className="w-5 h-5" />
            add memory
          </button>
        </div>
      )}

      {/* ── Create modal ── */}
      {isCreateModalOpen && userId && (
        <CreateCapsuleModal
          profileId={userId}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {/* ── Rename / Delete modals ── */}
      {renameTarget && (
        <RenameCapsuleModal
          capsule={renameTarget}
          onSave={handleRenameSave}
          onCancel={() => setRenameTarget(null)}
        />
      )}
      {colorTarget && (
        <ChangeColorModal
          capsule={colorTarget}
          onSave={handleColorSave}
          onCancel={() => setColorTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteCapsuleModal
          capsule={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Capture flow overlay — targets the most recently created capsule ── */}
      {showCaptureFlow && capsules[0] && (
        <CaptureFlow
          onClose={() => setShowCaptureFlow(false)}
          onAddToCapsule={handleCaptureComplete}
          capsuleId={capsules[0].id}
        />
      )}
    </div>
  )
}
