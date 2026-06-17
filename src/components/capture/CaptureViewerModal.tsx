'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { X, Sparkles, Cloud } from 'lucide-react'
import FloatingCanvas2D from './FloatingCanvas2D'
import DocumentViewer from './DocumentViewer'
import VideoCaptureViewer from './VideoCaptureViewer'
import SpinSequenceViewer from './SpinSequenceViewer'
import LenticularViewer from './LenticularViewer'
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
  title?: string
  cloudUrl: string
  cloudPages?: string[]
  cloudFrames?: string[]
  cloudReliefFrames?: string[]
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
  const isRelief = mode === 'relief180'
  const isVideo = capture.mediaType === 'video'
  const badgeClass = BADGE[mode] ?? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'

  const spinFrameUrls = capture.cloudFrames ?? []
  const reliefFrameUrls = capture.cloudReliefFrames ?? []
  const docPageUrls = capture.cloudPages?.length ? capture.cloudPages : [capture.cloudUrl]

  const hasSpinFrames = spinFrameUrls.length >= 2
  const hasReliefFrames = reliefFrameUrls.length >= 2

  const dateStr = new Date(capture.timestamp).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

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

  // Hint text for footer
  let hintText: string
  if (isScan3d && hasSpinFrames) hintText = 'Drag left/right to rotate · ← → keys also work'
  else if (isRelief && hasReliefFrames) hintText = 'Drag left/right to shift the light · feel the depth'
  else if (isVideo) hintText = 'Drag to orbit · Pinch to zoom'
  else if (is2D) hintText = 'Move your phone or drag to feel the depth'
  else if (isDocument) hintText = 'Drag to tilt · Pinch or scroll to zoom'
  else hintText = 'Asset stored in cloud'

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
          : isRelief && hasReliefFrames
            ? <LenticularViewer imageUrls={reliefFrameUrls} />
            : isVideo
              ? <VideoCaptureViewer videoUrl={capture.cloudUrl} mode={mode} />
              : is2D
                ? <FloatingCanvas2D imageUrl={capture.cloudUrl} />
                : isDocument
                  ? <DocumentViewer imageUrls={docPageUrls} />
                  : (
                    // Fallback for captures saved before migration 003 (no frame arrays).
                    // Show the primary thumbnail so the viewer is never a blank screen.
                    <div className="w-full h-full flex items-center justify-center bg-zinc-950 p-6">
                      <img
                        src={capture.cloudUrl}
                        alt={capture.title ?? ''}
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                        draggable={false}
                      />
                    </div>
                  )
        }
      </div>

      {/* Footer hint */}
      <div className="flex-shrink-0 px-5 py-2 border-t border-zinc-800/60 bg-zinc-950/80">
        <p className="text-xs text-zinc-600 text-center">{hintText}</p>
      </div>
    </div>
  )
}

function CloudAssetPlaceholder({ cloudUrl }: { cloudUrl: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-zinc-950 px-8">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <Cloud className="w-7 h-7 text-zinc-600" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-zinc-400 text-sm font-semibold">Asset Stored in Cloud</p>
        <p className="text-zinc-600 text-xs leading-relaxed max-w-[260px]">
          Full-fidelity playback fetches from the cloud server. This would stream automatically in production.
        </p>
        <p className="text-zinc-700 text-[10px] font-mono mt-3 break-all">{cloudUrl}</p>
      </div>
    </div>
  )
}
