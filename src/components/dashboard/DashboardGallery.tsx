'use client'

import { useState, useCallback, useEffect } from 'react'
import { Box } from 'lucide-react'
import CapsuleDashboard from './CapsuleDashboard'
import CaptureFlow from '@/components/capture/CaptureFlow'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function DashboardGallery() {
  const [showScanFlow, setShowScanFlow] = useState(false)
  // Increment to remount CapsuleDashboard and re-read IndexedDB after a new capture is saved
  const [galleryKey, setGalleryKey] = useState(0)

  useEffect(() => {
    document.body.style.overflow = showScanFlow ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showScanFlow])

  const handleCaptureComplete = useCallback(() => {
    setShowScanFlow(false)
    setGalleryKey(k => k + 1)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-200">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-900 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/25 dark:border-amber-400/25 flex items-center justify-center">
              <Box className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-zinc-100">
              CubbyHole
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 select-none">
              H
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CapsuleDashboard
          key={galleryKey}
          onOpenCapture={() => setShowScanFlow(true)}
        />
      </main>

      {/* ── Capture flow overlay ── */}
      {showScanFlow && (
        <CaptureFlow
          onClose={() => setShowScanFlow(false)}
          onAddToCapsule={handleCaptureComplete}
        />
      )}
    </div>
  )
}
