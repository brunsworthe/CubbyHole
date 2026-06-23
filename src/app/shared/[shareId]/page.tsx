'use client'

import { useState, useEffect, useId, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Cloud, ChevronLeft, ChevronRight, Plus, Minus, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ThreeViewer = dynamic(() => import('@/components/ThreeViewer'), { ssr: false })
const LenticularViewer = dynamic(() => import('@/components/capture/LenticularViewer'), { ssr: false })

interface SharedCapture {
  id: string
  title: string
  cloud_url: string
  type: '2D' | '3D' | 'Relief' | 'Document'
  cloud_frames: string[] | null
  cloud_relief_frames: string[] | null
  cloud_pages: string[] | null
}

// Exact brand shelf icon from BrandLink.tsx, isolated for use in the viral-loop pill.
function BrandShelfIcon({ className }: { className?: string }) {
  const grainId = useId()
  const glowId = useId()

  return (
    <svg viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <pattern id={grainId} width="8" height="24" patternUnits="userSpaceOnUse">
          <rect width="8" height="24" fill="#8b5e3c" />
          <path d="M1   0 Q2.5 4  1.5 8  Q0.5 12 2   16 Q3   20 1.2 24" stroke="#6b4226" strokeWidth="0.4"  fill="none" opacity="0.5" />
          <path d="M4.5 0 Q3   5  4.8 9  Q6   13 4.2 17 Q3   21 4.8 24" stroke="#a87b52" strokeWidth="0.35" fill="none" opacity="0.4" />
          <path d="M6.8 0 Q7.6 4  6.5 9  Q5.8 14 7.2 18 Q7.8 21 6.6 24" stroke="#6b4226" strokeWidth="0.3"  fill="none" opacity="0.35" />
        </pattern>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.9" />
          <stop offset="60%"  stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="40" height="24" fill={`url(#${grainId})`} />
      <rect x="2"   y="2"    width="6"   height="9"   fill="#ef4444" />
      <rect x="2.3" y="2.45" width="5.4" height="8.1" fill="white" fillOpacity="0.25" />
      <rect x="2.6" y="2.9"  width="4.8" height="7.2" fill="#f87171" />
      <rect x="3.5" y="4.25" width="3"   height="4.5" fill="#fefefe" />
      <rect x="4.1" y="5.15" width="1.8" height="2.7" fill="#ffffff" fillOpacity="0.5" />
      <rect x="2"   y="2"    width="6"   height="9"   fill={`url(#${glowId})`} />
      <rect x="2"   y="13"   width="6"   height="9"   fill="#ef4444" />
      <rect x="2.3" y="13.45" width="5.4" height="8.1" fill="white" fillOpacity="0.25" />
      <rect x="2.6" y="13.9" width="4.8" height="7.2" fill="#f87171" />
      <rect x="3.5" y="15.25" width="3"  height="4.5" fill="#fefefe" />
      <rect x="4.1" y="16.15" width="1.8" height="2.7" fill="#ffffff" fillOpacity="0.5" />
      <rect x="2"   y="13"   width="6"   height="9"   fill={`url(#${glowId})`} />
      <rect x="9.5"  y="2"    width="6"   height="9"   fill="#0ea5e9" />
      <rect x="9.8"  y="2.45" width="5.4" height="8.1" fill="white" fillOpacity="0.25" />
      <rect x="10.1" y="2.9"  width="4.8" height="7.2" fill="#38bdf8" />
      <rect x="11"   y="4.25" width="3"   height="4.5" fill="#fefefe" />
      <rect x="11.6" y="5.15" width="1.8" height="2.7" fill="#ffffff" fillOpacity="0.5" />
      <rect x="9.5"  y="2"    width="6"   height="9"   fill={`url(#${glowId})`} />
      <rect x="9.5"  y="13"   width="6"   height="9"   fill="#0ea5e9" />
      <rect x="9.8"  y="13.45" width="5.4" height="8.1" fill="white" fillOpacity="0.25" />
      <rect x="10.1" y="13.9" width="4.8" height="7.2" fill="#38bdf8" />
      <rect x="11"   y="15.25" width="3"  height="4.5" fill="#fefefe" />
      <rect x="11.6" y="16.15" width="1.8" height="2.7" fill="#ffffff" fillOpacity="0.5" />
      <rect x="9.5"  y="13"   width="6"   height="9"   fill={`url(#${glowId})`} />
      <rect x="17"   y="2"    width="6"   height="9"   fill="#fde047" />
      <rect x="17.3" y="2.45" width="5.4" height="8.1" fill="white" fillOpacity="0.25" />
      <rect x="17.6" y="2.9"  width="4.8" height="7.2" fill="#fef08a" />
      <rect x="18.5" y="4.25" width="3"   height="4.5" fill="#fefefe" />
      <rect x="19.1" y="5.15" width="1.8" height="2.7" fill="#ffffff" fillOpacity="0.5" />
      <rect x="17"   y="2"    width="6"   height="9"   fill={`url(#${glowId})`} />
      <rect x="17"   y="13"   width="6"   height="9"   fill="#fde047" />
      <rect x="17.3" y="13.45" width="5.4" height="8.1" fill="white" fillOpacity="0.25" />
      <rect x="17.6" y="13.9" width="4.8" height="7.2" fill="#fef08a" />
      <rect x="18.5" y="15.25" width="3"  height="4.5" fill="#fefefe" />
      <rect x="19.1" y="16.15" width="1.8" height="2.7" fill="#ffffff" fillOpacity="0.5" />
      <rect x="17"   y="13"   width="6"   height="9"   fill={`url(#${glowId})`} />
      <rect x="24.5" y="2"    width="6"   height="9"   fill="#4ade80" />
      <rect x="24.8" y="2.45" width="5.4" height="8.1" fill="white" fillOpacity="0.25" />
      <rect x="25.1" y="2.9"  width="4.8" height="7.2" fill="#86efac" />
      <rect x="26"   y="4.25" width="3"   height="4.5" fill="#fefefe" />
      <rect x="26.6" y="5.15" width="1.8" height="2.7" fill="#ffffff" fillOpacity="0.5" />
      <rect x="24.5" y="2"    width="6"   height="9"   fill={`url(#${glowId})`} />
      <rect x="24.5" y="13"   width="6"   height="9"   fill="#4ade80" />
      <rect x="24.8" y="13.45" width="5.4" height="8.1" fill="white" fillOpacity="0.25" />
      <rect x="25.1" y="13.9" width="4.8" height="7.2" fill="#86efac" />
      <rect x="26"   y="15.25" width="3"  height="4.5" fill="#fefefe" />
      <rect x="26.6" y="16.15" width="1.8" height="2.7" fill="#ffffff" fillOpacity="0.5" />
      <rect x="24.5" y="13"   width="6"   height="9"   fill={`url(#${glowId})`} />
      <rect x="32"   y="2"    width="6"   height="9"   fill="#8b5cf6" />
      <rect x="32.3" y="2.45" width="5.4" height="8.1" fill="white" fillOpacity="0.25" />
      <rect x="32.6" y="2.9"  width="4.8" height="7.2" fill="#a78bfa" />
      <rect x="33.5" y="4.25" width="3"   height="4.5" fill="#fefefe" />
      <rect x="34.1" y="5.15" width="1.8" height="2.7" fill="#ffffff" fillOpacity="0.5" />
      <rect x="32"   y="2"    width="6"   height="9"   fill={`url(#${glowId})`} />
      <rect x="32"   y="13"   width="6"   height="9"   fill="#8b5cf6" />
      <rect x="32.3" y="13.45" width="5.4" height="8.1" fill="white" fillOpacity="0.25" />
      <rect x="32.6" y="13.9" width="4.8" height="7.2" fill="#a78bfa" />
      <rect x="33.5" y="15.25" width="3"  height="4.5" fill="#fefefe" />
      <rect x="34.1" y="16.15" width="1.8" height="2.7" fill="#ffffff" fillOpacity="0.5" />
      <rect x="32"   y="13"   width="6"   height="9"   fill={`url(#${glowId})`} />
    </svg>
  )
}

function PoweredByPill() {
  return (
    <Link
      href="/"
      className="fixed bottom-6 right-6 z-30 flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all shadow-lg shadow-black/40"
    >
      <div className="w-6 h-6 rounded-sm overflow-hidden flex-shrink-0">
        <BrandShelfIcon className="w-full h-full text-white" />
      </div>
      <span className="text-base font-medium text-white lowercase tracking-tight">
        powered by cubbyhole
      </span>
    </Link>
  )
}

export default function SharedCapturePage() {
  const params = useParams()
  const shareId = params.shareId as string

  const [capture, setCapture] = useState<SharedCapture | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [scale, setScale] = useState(1)
  const [isPanning, setIsPanning] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  // Reset zoom every time the page changes, so the next page always opens fit-to-screen.
  useEffect(() => {
    setScale(1)
  }, [currentIndex])

  const zoomIn = useCallback(() => setScale(s => Math.min(4, s + 0.25)), [])
  const zoomOut = useCallback(() => setScale(s => Math.max(0.25, s - 0.25)), [])
  const resetZoom = useCallback(() => setScale(1), [])

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return
    isPanningRef.current = true
    setIsPanning(true)
    lastPosRef.current = { x: e.clientX, y: e.clientY }
  }, [scale])

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current || !scrollRef.current) return
    const dx = e.clientX - lastPosRef.current.x
    const dy = e.clientY - lastPosRef.current.y
    scrollRef.current.scrollLeft -= dx
    scrollRef.current.scrollTop -= dy
    lastPosRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePanEnd = useCallback(() => {
    isPanningRef.current = false
    setIsPanning(false)
  }, [])

  useEffect(() => {
    if (!shareId) return

    supabase
      .from('captures')
      .select('id, title, cloud_url, type, cloud_frames, cloud_relief_frames, cloud_pages')
      .eq('share_id', shareId)
      .eq('is_public', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
        } else {
          setCapture(data as SharedCapture)
        }
        setLoading(false)
      })
  }, [shareId])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
      </div>
    )
  }

  if (notFound || !capture) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Cloud className="w-10 h-10 text-zinc-700" />
        <p className="text-white/70 text-sm">Memory not found or is no longer public.</p>
        <PoweredByPill />
      </div>
    )
  }

  const spinFrameUrls = capture.cloud_frames ?? []
  const reliefFrameUrls = capture.cloud_relief_frames ?? []
  const hasSpinFrames = spinFrameUrls.length >= 2
  const hasReliefFrames = reliefFrameUrls.length >= 2

  const is3D = capture.type === '3D' && hasSpinFrames
  const isRelief = capture.type === 'Relief' && hasReliefFrames
  const isPaginated = capture.type === '2D' || capture.type === 'Document'

  const pageUrls = capture.cloud_pages?.length ? capture.cloud_pages : [capture.cloud_url]
  const hasMultiplePages = isPaginated && pageUrls.length > 1
  const safeIndex = Math.min(currentIndex, pageUrls.length - 1)

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {is3D ? (
        <ThreeViewer imageUrls={spinFrameUrls} />
      ) : isRelief ? (
        <div className="absolute inset-0 w-full h-full">
          <LenticularViewer imageUrls={reliefFrameUrls} readOnly />
        </div>
      ) : (
        <div
          ref={scrollRef}
          className={`absolute inset-0 overflow-auto flex items-center justify-center p-6 ${
            scale > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''
          }`}
          onMouseDown={handlePanStart}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanEnd}
          onMouseLeave={handlePanEnd}
        >
          <div key={safeIndex} className="page-flip">
            <img
              src={isPaginated ? pageUrls[safeIndex] : capture.cloud_url}
              alt={capture.title}
              className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-200"
              style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
              draggable={false}
            />
          </div>

          {isPaginated && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1.5 rounded-full bg-black/40 border border-white/15 backdrop-blur-md shadow-lg">
              <button
                onClick={zoomOut}
                disabled={scale <= 0.25}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                aria-label="Zoom out"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center text-xs font-medium text-white/80 tabular-nums">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={resetZoom}
                className="px-2.5 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={zoomIn}
                disabled={scale >= 4}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                aria-label="Zoom in"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {hasMultiplePages && (
            <>
              <button
                onClick={() => setCurrentIndex(i => (i - 1 + pageUrls.length) % pageUrls.length)}
                className="fixed left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentIndex(i => (i + 1) % pageUrls.length)}
                className="fixed right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-black/40 border border-white/15 backdrop-blur-md text-white/85 text-xs font-medium shadow-lg">
                Page {safeIndex + 1} of {pageUrls.length}
              </div>
            </>
          )}

          <style jsx>{`
            @keyframes pageFlip {
              from { opacity: 0; transform: translateX(16px); }
              to   { opacity: 1; transform: translateX(0); }
            }
            .page-flip {
              animation: pageFlip 300ms ease-out;
            }
          `}</style>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <p className="text-white text-lg font-semibold drop-shadow-sm">{capture.title}</p>
      </div>

      <PoweredByPill />
    </div>
  )
}
