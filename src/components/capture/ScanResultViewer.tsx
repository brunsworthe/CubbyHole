'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { PackagePlus, RotateCcw, Sparkles, CheckCircle2, Trash2 } from 'lucide-react'
import DocumentViewer from './DocumentViewer'
import ReliefViewer from './ReliefViewer'
import LenticularViewer from './LenticularViewer'
import VideoCaptureViewer from './VideoCaptureViewer'
import SpinSequenceViewer from './SpinSequenceViewer'
import type { CaptureMode, CapturedMedia } from './CaptureFlow'

const TimeCapsuleViewer = dynamic(
  () => import('@/components/3d/TimeCapsuleViewer'),
  { ssr: false }
)

const MODEL_URL =
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb'

const STATS_3D = [
  { label: 'Frames',   value: '8'      },
  { label: 'Coverage', value: '360°'   },
  { label: 'File Size', value: '~14 MB' },
]

const STATS_2D = [
  { label: 'Depth Layers', value: '4'      },
  { label: 'Canvas Res',   value: '2K'     },
  { label: 'File Size',    value: '1.8 MB' },
]

const STATS_DOCUMENT = [
  { label: 'Pages',      value: '3'       },
  { label: 'Resolution', value: '300 DPI' },
  { label: 'File Size',  value: '2.4 MB'  },
]

const STATS_RELIEF = [
  { label: 'Frames',   value: '5'      },
  { label: 'Coverage', value: '180°'   },
  { label: 'File Size', value: '4.8 MB' },
]

interface Props {
  mode: CaptureMode
  capturedMedia: CapturedMedia | null
  onAddToCapsule: () => void
  onRescan: () => void
  onClearCache?: () => void
}

export default function ScanResultViewer({ mode, capturedMedia, onAddToCapsule, onRescan, onClearCache }: Props) {
  const [added, setAdded] = useState(false)
  const [docPageUrls, setDocPageUrls] = useState<string[]>([])

  // Create blob URLs for all captured document pages, revoke on change/unmount
  useEffect(() => {
    const pages = capturedMedia?.pages
    if (!pages?.length) { setDocPageUrls([]); return }
    const urls = pages.map(b => URL.createObjectURL(b))
    setDocPageUrls(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [capturedMedia])

  // Create blob URLs for the 8 scan3d frames, revoke on change/unmount
  const [spinFrameUrls, setSpinFrameUrls] = useState<string[]>([])
  useEffect(() => {
    const frames = capturedMedia?.frames
    if (!frames?.length) { setSpinFrameUrls([]); return }
    const urls = frames.map(b => URL.createObjectURL(b))
    setSpinFrameUrls(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [capturedMedia])

  // Create blob URLs for the 5 relief180 lenticular frames, revoke on change/unmount
  const [reliefFrameUrls, setReliefFrameUrls] = useState<string[]>([])
  useEffect(() => {
    const frames = capturedMedia?.reliefFrames
    if (!frames?.length) { setReliefFrameUrls([]); return }
    const urls = frames.map(b => URL.createObjectURL(b))
    setReliefFrameUrls(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [capturedMedia])

  const is2D = mode === 'artwork2d'
  const isDocument = mode === 'document'
  const isRelief = mode === 'relief180'
  const stats = is2D ? STATS_2D : isDocument ? STATS_DOCUMENT : isRelief ? STATS_RELIEF : STATS_3D

  const capturedUrl = capturedMedia?.url
  const isVideoCapture = capturedMedia?.mediaType === 'video'

  const handleAdd = () => {
    setAdded(true)
    setTimeout(onAddToCapsule, 800)
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Top overlay */}
      <div className="absolute top-0 inset-x-0 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.70) 0%, transparent 100%)' }}
      >
        <div className="flex items-start justify-between px-5 pt-12 pb-8 pointer-events-auto">
          <div>
            <h2 className="text-white font-semibold text-lg leading-tight">
              {is2D ? 'Masterpiece Captured' : isDocument ? 'Document Digitized' : isRelief ? 'Relief Mapped' : 'Scan Complete'}
            </h2>
            <p className="text-white/48 text-xs mt-1">
              {is2D
                ? docPageUrls.length >= 2
                  ? 'Drag to inspect · Use the arrows to flip pages'
                  : 'Move your phone or drag to feel the depth'
                : isDocument
                  ? 'Drag to inspect · Use the arrows to flip pages'
                  : isRelief
                    ? reliefFrameUrls.length >= 2
                      ? 'Drag left or right to feel the depth shift'
                      : 'Drag to orbit · Zoom to inspect the surface'
                    : spinFrameUrls.length >= 2
                      ? 'Drag left or right to spin through all 8 angles'
                      : 'Drag to rotate · Pinch to zoom'}
            </p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 mt-0.5 border ${
            is2D
              ? 'bg-violet-500/15 border-violet-500/25'
              : isDocument
                ? 'bg-sky-500/15 border-sky-500/25'
                : isRelief
                  ? 'bg-orange-500/15 border-orange-500/25'
                  : 'bg-emerald-500/15 border-emerald-500/25'
          }`}>
            <Sparkles className={`w-3.5 h-3.5 ${is2D ? 'text-violet-400' : isDocument ? 'text-sky-400' : isRelief ? 'text-orange-400' : 'text-emerald-400'}`} />
            <span className={`text-xs font-medium ${is2D ? 'text-violet-400' : isDocument ? 'text-sky-400' : isRelief ? 'text-orange-400' : 'text-emerald-400'}`}>
              {is2D ? 'Magic Mode' : isDocument ? 'Text Enhanced' : isRelief ? 'Relief Mode' : 'High Quality'}
            </span>
          </div>
        </div>
      </div>

      {/* Showcase viewport */}
      <div className="flex-1 relative min-h-0">
        {mode === 'scan3d' && spinFrameUrls.length >= 2
          ? <SpinSequenceViewer imageUrls={spinFrameUrls} />
          : isRelief && reliefFrameUrls.length >= 2
            ? <LenticularViewer imageUrls={reliefFrameUrls} />
            : isVideoCapture
              ? <VideoCaptureViewer videoUrl={capturedUrl!} mode={mode} />
              : (is2D || isDocument)
                ? <DocumentViewer imageUrls={docPageUrls.length > 0 ? docPageUrls : capturedUrl ? [capturedUrl] : undefined} />
                : isRelief
                  ? <ReliefViewer />
                  : <TimeCapsuleViewer modelUrl={MODEL_URL} />
        }

        {/* Pedestal warm glow */}
        <div
          className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
          style={{
            background: is2D
              ? 'radial-gradient(ellipse 65% 45% at 50% 100%, rgba(167,139,250,0.09) 0%, transparent 70%)'
              : isDocument
                ? 'radial-gradient(ellipse 65% 45% at 50% 100%, rgba(56,189,248,0.08) 0%, transparent 70%)'
                : isRelief
                  ? 'radial-gradient(ellipse 65% 45% at 50% 100%, rgba(251,146,60,0.09) 0%, transparent 70%)'
                  : 'radial-gradient(ellipse 65% 45% at 50% 100%, rgba(251,191,36,0.07) 0%, transparent 70%)',
          }}
        />

        {/* Showcase stats — hidden when spin or lenticular viewer is active (they have their own HUD) */}
        {!(mode === 'scan3d' && spinFrameUrls.length >= 2) && !(isRelief && reliefFrameUrls.length >= 2) && (
          <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2.5 pointer-events-none px-4">
            {stats.map(({ label, value }) => (
              <div
                key={label}
                className="bg-black/55 backdrop-blur-sm border border-white/10 rounded-xl px-3.5 py-2 text-center"
              >
                <div className="text-white/38 text-[10px] leading-none mb-1">{label}</div>
                <div className="text-white font-mono text-sm font-medium leading-none">{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex-shrink-0 px-4 pt-4 pb-8 space-y-2.5"
        style={{ background: 'linear-gradient(to top, #09090b 60%, transparent 100%)' }}
      >
        {/* Primary CTA */}
        <button
          onClick={handleAdd}
          disabled={added}
          className={`w-full flex items-center justify-center gap-2.5 font-semibold py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
            added
              ? 'bg-emerald-600 text-white cursor-default'
              : is2D
              ? 'bg-violet-500 hover:bg-violet-400 text-white'
              : isRelief
              ? 'bg-orange-500 hover:bg-orange-400 text-white'
              : isDocument
              ? 'bg-sky-500 hover:bg-sky-400 text-white'
              : 'bg-slate-500 hover:bg-slate-400 text-white'
          }`}
        >
          {added
            ? <><CheckCircle2 className="w-5 h-5" /> Added to Capsule</>
            : <><PackagePlus className="w-5 h-5" /> Add to Time Capsule</>
          }
        </button>

        {/* Secondary actions */}
        <div className="flex gap-2.5">
          <button
            onClick={onRescan}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 font-medium py-3 rounded-2xl border border-zinc-700/80 transition-colors active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            Discard & Re-scan
          </button>
        </div>

        {/* Dev utility — wipe IndexedDB and start fresh */}
        {onClearCache && (
          <button
            onClick={onClearCache}
            className="w-full flex items-center justify-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-xs py-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Cache · Start Over
          </button>
        )}
      </div>
    </div>
  )
}
