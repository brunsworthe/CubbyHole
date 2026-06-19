'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { X, Sparkles, MoreHorizontal, Pencil, Trash2, Boxes } from 'lucide-react'
import DocumentViewer from './DocumentViewer'
import VideoCaptureViewer from './VideoCaptureViewer'
import SpinSequenceViewer from './SpinSequenceViewer'
import LenticularViewer from './LenticularViewer'
import type { CaptureMode } from './CaptureFlow'

const TimeCapsuleViewer = dynamic(
  () => import('@/components/3d/TimeCapsuleViewer'),
  { ssr: false }
)

// Experimental WebGL alt-view, opt-in via a toggle so the default
// SpinSequenceViewer/LenticularViewer experience is untouched.
const ThreeViewer = dynamic(
  () => import('@/components/ThreeViewer'),
  { ssr: false }
)

export type ViewableCapture = {
  id: string
  mode: string
  type: string
  mediaType: 'image' | 'video'
  timestamp: number
  title?: string
  cloudUrl: string
  cloudPages?: string[]
  cloudFrames?: string[]
  cloudReliefFrames?: string[]
}

const BADGE: Record<string, string> = {
  scan3d:    'bg-slate-500/15 text-slate-500 border-slate-500/30',
  relief180: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  artwork2d: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  document:  'bg-sky-500/15 text-sky-400 border-sky-500/30',
}

interface Props {
  capture: ViewableCapture
  onClose: () => void
  onRename?: (id: string, newTitle: string) => void
  onDelete?: (id: string) => void
}

export default function CaptureViewerModal({ capture, onClose, onRename, onDelete }: Props) {
  const mode = capture.mode as CaptureMode
  const is2D = mode === 'artwork2d'
  const isDocument = mode === 'document'
  const isScan3d = mode === 'scan3d'
  const isRelief = mode === 'relief180'
  const isVideo = capture.mediaType === 'video'
  const badgeClass = BADGE[mode] ?? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'

  const spinFrameUrls = capture.cloudFrames ?? []
  const reliefFrameUrls = capture.cloudReliefFrames ?? []
  const docPageUrls = capture.cloudPages?.length ? capture.cloudPages : [capture.cloudUrl]

  const hasSpinFrames = spinFrameUrls.length >= 2
  const hasReliefFrames = reliefFrameUrls.length >= 2

  // Experimental WebGL alt-view: only offered where multi-frame data exists,
  // and only swapped in when the user explicitly toggles it on.
  const canThreeView = (isScan3d && hasSpinFrames) || (isRelief && hasReliefFrames)
  const threeViewerImageUrls = isScan3d ? spinFrameUrls : reliefFrameUrls
  const [showThreeViewer, setShowThreeViewer] = useState(false)

  const dateStr = new Date(capture.timestamp).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  // ── Management state ─────────────────────────────────────────────────────────
  const canManage = !!(onRename || onDelete)
  const [localTitle, setLocalTitle] = useState(capture.title ?? '')
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameMode, setRenameMode] = useState(false)
  const [renameValue, setRenameValue] = useState(capture.title ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Focus input when rename overlay opens
  useEffect(() => {
    if (renameMode) {
      setRenameValue(localTitle)
      setTimeout(() => renameInputRef.current?.select(), 30)
    }
  }, [renameMode, localTitle])

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Escape: dismiss inner overlays first, then the whole viewer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (renameMode)    { setRenameMode(false);    return }
      if (confirmDelete) { setConfirmDelete(false);  return }
      if (menuOpen)      { setMenuOpen(false);       return }
      onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, renameMode, confirmDelete, menuOpen])

  const handleRenameConfirm = useCallback(() => {
    const trimmed = renameValue.trim()
    if (!trimmed) return
    setLocalTitle(trimmed)
    setRenameMode(false)
    onRename?.(capture.id, trimmed)
  }, [renameValue, capture.id, onRename])

  const handleDeleteConfirm = useCallback(() => {
    setConfirmDelete(false)
    onDelete?.(capture.id)
    onClose()
  }, [capture.id, onDelete, onClose])

  // ── Hint text ─────────────────────────────────────────────────────────────────
  let hintText: string
  if (isScan3d && hasSpinFrames) hintText = 'Drag left/right to rotate · ← → keys also work'
  else if (isRelief && hasReliefFrames) hintText = 'Drag left/right to shift the light · feel the depth'
  else if (isVideo) hintText = 'Drag to orbit · Pinch to zoom'
  else if (is2D || isDocument) hintText = 'Drag to tilt · Pinch or scroll to zoom'
  else hintText = ''

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-zinc-950"
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${badgeClass}`}>
            <Sparkles className="w-3 h-3" />
            {capture.type}
          </div>
          {localTitle && (
            <span className="text-sm font-semibold text-zinc-200 truncate max-w-[160px]">
              {localTitle}
            </span>
          )}
          <span className="text-xs text-zinc-500 flex-shrink-0">{dateStr}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          {/* Experimental WebGL alt-view toggle */}
          {canThreeView && (
            <button
              onClick={() => setShowThreeViewer(v => !v)}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                showThreeViewer
                  ? 'bg-slate-500 border-slate-400 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-400 hover:text-zinc-100'
              }`}
              aria-label="Toggle 3D WebGL view"
              title="Toggle experimental 3D view"
            >
              <Boxes className="w-4 h-4" />
            </button>
          )}

          {/* Management menu */}
          {canManage && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-44 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-10">
                  {onRename && (
                    <button
                      onClick={() => { setMenuOpen(false); setRenameMode(true) }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <Pencil className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      Rename
                    </button>
                  )}
                  {onRename && onDelete && (
                    <div className="border-t border-zinc-800" />
                  )}
                  {onDelete && (
                    <button
                      onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-950/30 transition-colors text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Close viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="relative flex-1 min-h-0">
        {canThreeView && showThreeViewer
          ? <ThreeViewer imageUrls={threeViewerImageUrls} />
          : isScan3d && hasSpinFrames
          ? <SpinSequenceViewer imageUrls={spinFrameUrls} />
          : isRelief && hasReliefFrames
            ? <LenticularViewer imageUrls={reliefFrameUrls} />
            : isVideo
              ? <VideoCaptureViewer videoUrl={capture.cloudUrl} mode={mode} />
              : (is2D || isDocument)
                ? <DocumentViewer imageUrls={docPageUrls} />
                : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-950 p-6">
                      <img
                        src={capture.cloudUrl}
                        alt={localTitle}
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                        draggable={false}
                      />
                    </div>
                  )
        }
      </div>

      {/* Footer hint */}
      {hintText && (
        <div className="flex-shrink-0 px-5 py-2 border-t border-zinc-800/60 bg-zinc-950/80">
          <p className="text-xs text-zinc-600 text-center">{hintText}</p>
        </div>
      )}

      {/* ── Rename overlay ────────────────────────────────────────────────────── */}
      {renameMode && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-4 bg-black/65 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-zinc-100 text-base">Rename memory</h3>
              <button
                onClick={() => setRenameMode(false)}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && renameValue.trim()) handleRenameConfirm()
              }}
              maxLength={60}
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-slate-500 rounded-xl px-3.5 py-2.5 text-zinc-100 text-sm outline-none transition-colors mb-5"
            />
            <div className="flex gap-2.5">
              <button
                onClick={() => setRenameMode(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameConfirm}
                disabled={!renameValue.trim()}
                className="flex-1 py-2.5 rounded-xl bg-slate-500 hover:bg-slate-400 active:bg-slate-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation overlay ───────────────────────────────────────── */}
      {confirmDelete && (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-4 bg-black/65 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-zinc-100 text-base leading-snug">Delete memory?</h3>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">{localTitle}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed mb-5">
              This will permanently remove this memory from the capsule. This cannot be undone.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
