'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { X, Sparkles } from 'lucide-react'
import FloatingCanvas2D from './FloatingCanvas2D'
import DocumentViewer from './DocumentViewer'
import ReliefViewer from './ReliefViewer'
import VideoCaptureViewer from './VideoCaptureViewer'
import SpinSequenceViewer from './SpinSequenceViewer'
import type { CaptureMode } from './CaptureFlow'

const TimeCapsuleViewer = dynamic(
  () => import('@/components/3d/TimeCapsuleViewer'),
  { ssr: false }
)

const FALLBACK_MODEL =
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb'

export type ViewableCapture = {
  id: string
  mode: string
  type: string
  mediaType: 'image' | 'video'
  timestamp: number
  url: string
  title?: string
  pages?: Blob[]   // document mode: all captured page blobs
  frames?: Blob[]  // scan3d mode: 8-frame segmented capture array
}

const BADGE: Record<string, string> = {
  scan3d:    'bg-amber-500/15 text-amber-500 border-amber-500/30',
  relief180: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  artwork2d: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  document:  'bg-sky-500/15 text-sky-400 border-sky-500/30',
}

interface Props {
  capture: ViewableCapture
  onClose: () => void
}

export default function CaptureViewerModal({ capture, onClose }: Props) {
  const mode = capture.mode as CaptureMode
  const is2D = mode === 'artwork2d'
  const isDocument = mode === 'document'
  const isScan3d = mode === 'scan3d'
  const isVideo = capture.mediaType === 'video'
  const badgeClass = BADGE[mode] ?? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
  const [docPageUrls, setDocPageUrls] = useState<string[]>([])
  const [spinFrameUrls, setSpinFrameUrls] = useState<string[]>([])

  const dateStr = new Date(capture.timestamp).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  // Create blob URLs for all document pages, revoke on unmount
  useEffect(() => {
    const pages = capture.pages
    if (!pages?.length) { setDocPageUrls([]); return }
    const urls = pages.map(b => URL.createObjectURL(b))
    setDocPageUrls(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [capture])

  // Create blob URLs for the 8 scan3d frames, revoke on unmount
  useEffect(() => {
    const frames = capture.frames
    if (!frames?.length) { setSpinFrameUrls([]); return }
    const urls = frames.map(b => URL.createObjectURL(b))
    setSpinFrameUrls(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [capture])

  const hasSpinFrames = spinFrameUrls.length >= 2

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-zinc-950"
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${badgeClass}`}>
            <Sparkles className="w-3 h-3" />
            {capture.type}
          </div>
          {capture.title && (
            <span className="text-sm font-semibold text-zinc-200 truncate max-w-[180px]">
              {capture.title}
            </span>
          )}
          <span className="text-xs text-zinc-500">{dateStr}</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Close viewer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Viewer */}
      <div className="flex-1 min-h-0">
        {isScan3d && hasSpinFrames
          ? <SpinSequenceViewer imageUrls={spinFrameUrls} />
          : isVideo
            ? <VideoCaptureViewer videoUrl={capture.url} mode={mode} />
            : is2D
              ? <FloatingCanvas2D imageUrl={capture.url} />
              : isDocument
                ? <DocumentViewer imageUrls={docPageUrls.length > 0 ? docPageUrls : [capture.url]} />
                : <TimeCapsuleViewer modelUrl={FALLBACK_MODEL} />
        }
      </div>

      {/* Footer hint */}
      <div className="flex-shrink-0 px-5 py-2 border-t border-zinc-800/60 bg-zinc-950/80">
        <p className="text-xs text-zinc-600 text-center">
          {isVideo
            ? 'Drag to orbit · Pinch to zoom'
            : is2D
              ? 'Move your phone or drag to feel the depth'
              : isDocument
                ? 'Drag to tilt · Pinch or scroll to zoom'
                : (isScan3d && hasSpinFrames)
                  ? 'Drag left/right to rotate · ← → keys also work'
                  : 'Drag to rotate · Pinch to zoom'}
        </p>
      </div>
    </div>
  )
}
