'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { PackagePlus, ShieldCheck, RotateCcw, Sparkles, CheckCircle2 } from 'lucide-react'
import FloatingCanvas2D from './FloatingCanvas2D'
import DocumentViewer from './DocumentViewer'
import type { CaptureMode } from './CaptureFlow'

const TimeCapsuleViewer = dynamic(
  () => import('@/components/3d/TimeCapsuleViewer'),
  { ssr: false }
)

const MODEL_URL =
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb'

const STATS_3D = [
  { label: 'Polygons',  value: '18,432' },
  { label: 'Texture',   value: '2K UV'  },
  { label: 'File Size', value: '4.2 MB' },
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

interface Props {
  mode: CaptureMode
  onAddToCapsule: () => void
  onSetPrivacy: () => void
  onRescan: () => void
}

export default function ScanResultViewer({ mode, onAddToCapsule, onSetPrivacy, onRescan }: Props) {
  const [added, setAdded] = useState(false)
  const is2D = mode === 'artwork2d'
  const isDocument = mode === 'document'
  const stats = is2D ? STATS_2D : isDocument ? STATS_DOCUMENT : STATS_3D

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
              {is2D ? 'Masterpiece Captured' : isDocument ? 'Document Digitized' : 'Scan Complete'}
            </h2>
            <p className="text-white/48 text-xs mt-1">
              {is2D
                ? 'Move your phone or drag to feel the depth'
                : isDocument
                  ? 'Drag to inspect · Use the arrows to flip pages'
                  : 'Drag to rotate · Pinch to zoom'}
            </p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 mt-0.5 border ${
            is2D
              ? 'bg-violet-500/15 border-violet-500/25'
              : isDocument
                ? 'bg-sky-500/15 border-sky-500/25'
                : 'bg-emerald-500/15 border-emerald-500/25'
          }`}>
            <Sparkles className={`w-3.5 h-3.5 ${is2D ? 'text-violet-400' : isDocument ? 'text-sky-400' : 'text-emerald-400'}`} />
            <span className={`text-xs font-medium ${is2D ? 'text-violet-400' : isDocument ? 'text-sky-400' : 'text-emerald-400'}`}>
              {is2D ? 'Magic Mode' : isDocument ? 'Text Enhanced' : 'High Quality'}
            </span>
          </div>
        </div>
      </div>

      {/* Showcase viewport */}
      <div className="flex-1 relative min-h-0">
        {is2D ? <FloatingCanvas2D /> : isDocument ? <DocumentViewer /> : <TimeCapsuleViewer modelUrl={MODEL_URL} />}

        {/* Pedestal warm glow */}
        <div
          className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
          style={{
            background: is2D
              ? 'radial-gradient(ellipse 65% 45% at 50% 100%, rgba(167,139,250,0.09) 0%, transparent 70%)'
              : isDocument
                ? 'radial-gradient(ellipse 65% 45% at 50% 100%, rgba(56,189,248,0.08) 0%, transparent 70%)'
                : 'radial-gradient(ellipse 65% 45% at 50% 100%, rgba(251,191,36,0.07) 0%, transparent 70%)',
          }}
        />

        {/* Showcase stats */}
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
              : 'bg-amber-500 hover:bg-amber-400 text-white'
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
            onClick={onSetPrivacy}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-3 rounded-2xl border border-zinc-700/80 transition-colors active:scale-[0.98]"
          >
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            Adjust Privacy
          </button>
          <button
            onClick={onRescan}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 font-medium py-3 rounded-2xl border border-zinc-700/80 transition-colors active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            Discard & Re-scan
          </button>
        </div>
      </div>
    </div>
  )
}
