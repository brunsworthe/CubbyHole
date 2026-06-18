'use client'

import { useState, useEffect } from 'react'
import { Cloud, WifiOff, RefreshCw } from 'lucide-react'

interface Props {
  hasError: boolean
  onRetry: () => void
  onCancel: () => void
}

export default function UploadSyncScreen({ hasError, onRetry, onCancel }: Props) {
  const [progress, setProgress] = useState(0)

  // Animate progress bar from 0 → 88% over ~2 seconds (CSS transition handles smoothness)
  useEffect(() => {
    if (hasError) { setProgress(0); return }
    const t = setTimeout(() => setProgress(88), 60)
    return () => clearTimeout(t)
  }, [hasError])

  return (
    <div className="fixed inset-0 z-[70] bg-zinc-950 flex flex-col items-center justify-center gap-6 px-6">
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 45% at 50% 48%, rgba(251,146,60,0.055) 0%, transparent 65%)',
        }}
      />

      {hasError ? (
        <>
          <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-red-950/40 border border-red-900/50">
            <WifiOff className="w-9 h-9 text-red-400" />
          </div>

          <div className="text-center space-y-1.5">
            <h2 className="text-white font-bold text-lg tracking-tight">Upload Failed</h2>
            <p className="text-zinc-500 text-sm max-w-[240px] leading-relaxed">
              Couldn&apos;t reach the cloud. Check your connection and try again.
            </p>
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onRetry}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-500 hover:bg-slate-400 active:bg-slate-600 text-white text-sm font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Animated cloud icon */}
          <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-950/40 border border-slate-900/50">
            <Cloud className="w-9 h-9 text-slate-400 animate-pulse" />
            <div className="absolute inset-[-4px] rounded-[20px] border-2 border-slate-500/15 animate-ping" />
          </div>

          <div className="text-center space-y-1.5">
            <h2 className="text-white font-bold text-lg tracking-tight">Syncing to Cloud&hellip;</h2>
            <p className="text-zinc-500 text-sm max-w-[240px] leading-relaxed">
              Uploading your capture securely. Please don&apos;t close this screen.
            </p>
          </div>

          {/* Determinate-style progress bar driven by state */}
          <div className="w-full max-w-xs space-y-2">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-slate-600 via-slate-400 to-slate-300"
                style={{
                  width: `${progress}%`,
                  transition: 'width 1.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
              />
            </div>
            <p className="text-zinc-700 text-[10px] font-mono tracking-widest text-center animate-pulse">
              DO NOT CLOSE THIS SCREEN
            </p>
          </div>
        </>
      )}
    </div>
  )
}
