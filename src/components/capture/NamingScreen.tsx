'use client'

import { useState, useRef, useEffect } from 'react'
import { Check } from 'lucide-react'
import type { CaptureMode } from './CaptureFlow'

const PLACEHOLDERS: Record<CaptureMode, string> = {
  scan3d:    "e.g. Sam's Clay Dinosaur",
  relief180: 'e.g. Ancient Stone Tablet',
  artwork2d: 'e.g. Watercolour Sunset',
  document:  'e.g. Passport — Front Page',
}

interface Props {
  mode: CaptureMode
  previewUrl: string
  mediaType: 'image' | 'video'
  onConfirm: (title: string | undefined) => void
}

export default function NamingScreen({ mode, previewUrl, mediaType, onConfirm }: Props) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Delay focus so the screen transition has time to settle
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150)
    return () => clearTimeout(t)
  }, [])

  const handleConfirm = () => onConfirm(title.trim() || undefined)

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(251,191,36,0.06) 0%, transparent 70%)' }}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Thumbnail */}
        <div className="relative w-24 h-24 rounded-2xl overflow-hidden mb-6 shadow-2xl ring-1 ring-white/10 flex-shrink-0">
          {mediaType === 'image' ? (
            <img src={previewUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          ) : (
            <video src={previewUrl} className="w-full h-full object-cover" muted autoPlay playsInline />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        </div>

        <h2 className="text-white font-bold text-xl mb-1.5 text-center tracking-tight">
          Name this memory
        </h2>
        <p className="text-zinc-500 text-sm text-center leading-relaxed mb-8 max-w-xs">
          Give it a personal label so you can find it later. You can always rename it from the gallery.
        </p>

        <div className="w-full max-w-sm space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            placeholder={PLACEHOLDERS[mode]}
            maxLength={60}
            className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-500/70 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 text-sm outline-none transition-colors"
          />
          <button
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm shadow-amber-500/20"
          >
            <Check className="w-4 h-4" />
            {title.trim() ? 'Save & Continue' : 'Continue'}
          </button>
          <button
            onClick={() => onConfirm(undefined)}
            className="w-full text-zinc-500 hover:text-zinc-400 text-sm py-2 transition-colors"
          >
            Skip naming
          </button>
        </div>
      </div>
    </div>
  )
}
