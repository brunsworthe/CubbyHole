'use client'

import { useState, useRef, useEffect } from 'react'
import { Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { CaptureMode, CaptureMetadata } from './CaptureFlow'

const TITLE_PLACEHOLDERS: Record<CaptureMode, string> = {
  scan3d:    "e.g. Sam's Clay Dinosaur",
  relief180: 'e.g. Ancient Stone Tablet',
  artwork2d: 'e.g. Watercolour Sunset',
  document:  'e.g. Passport — Front Page',
}

const MODE_DESCRIPTIONS: Record<CaptureMode, string> = {
  scan3d:    '360° object scan',
  relief180: 'textured relief capture',
  artwork2d: '2D artwork capture',
  document:  'document scan',
}

interface Capsule {
  id: string
  name: string
}

interface Props {
  mode: CaptureMode
  previewUrl: string
  mediaType: 'image' | 'video'
  // The capsule this flow was launched from (if any) — pre-selects the
  // selector below. When the flow starts from the global dashboard instead
  // of a specific capsule, this is undefined and the selector defaults to
  // the user's most recently created capsule once the list loads.
  initialCapsuleId?: string
  onConfirm: (metadata: CaptureMetadata) => void
}

export default function NamingScreen({ mode, previewUrl, mediaType, initialCapsuleId, onConfirm }: Props) {
  const now = new Date()
  const todayISO = now.toISOString().split('T')[0]
  const nowHHMM  = now.toTimeString().slice(0, 5)

  const [title, setTitle]           = useState('')
  const [creator, setCreator]       = useState('')
  const [captureDate, setCaptureDate] = useState(todayISO)
  const [captureTime, setCaptureTime] = useState(nowHHMM)
  const [location, setLocation]     = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [selectedCapsuleId, setSelectedCapsuleId] = useState(initialCapsuleId ?? '')

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150)
    return () => clearTimeout(t)
  }, [])

  // Load the user's capsules for the "Save to Capsule" selector. If this
  // flow wasn't launched from inside a specific capsule, default to the
  // most recently created one once the list arrives.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data } = await supabase
        .from('capsules')
        .select('id, name')
        .eq('profile_id', session.user.id)
        .order('created_at', { ascending: false })

      const rows = (data ?? []) as Capsule[]
      setCapsules(rows)
      setSelectedCapsuleId(prev => prev || rows[0]?.id || '')
    })
  }, [])

  const handleConfirm = () => {
    if (isUploading) return
    setIsUploading(true)

    try {
      const resolvedTitle = title.trim() ||
        `${MODE_DESCRIPTIONS[mode]} — ${captureDate}${captureTime ? ` ${captureTime}` : ''}`

      onConfirm({
        title:       resolvedTitle,
        creator:     creator.trim()     || undefined,
        captureDate: captureDate        || undefined,
        captureTime: captureTime        || undefined,
        location:    location.trim()    || undefined,
        description: description.trim() || undefined,
        capsuleId:   selectedCapsuleId   || undefined,
      })
    } finally {
      setIsUploading(false)
    }
  }

  const inputClass =
    'w-full bg-zinc-900 border border-zinc-700 focus:border-slate-500/70 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 text-sm outline-none transition-colors'

  const labelClass =
    'block text-zinc-400 text-xs font-medium mb-1.5 tracking-wider uppercase'

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(251,191,36,0.06) 0%, transparent 70%)' }}
      />

      {/* Header — thumbnail + heading */}
      <div className="flex-shrink-0 flex flex-col items-center pt-10 pb-4 px-6">
        <div className="relative w-24 h-24 rounded-2xl overflow-hidden mb-6 shadow-2xl ring-1 ring-white/10">
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
        <p className="text-zinc-500 text-sm text-center leading-relaxed max-w-xs">
          Add a label and optional details. You can edit these from the gallery.
        </p>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="w-full max-w-sm mx-auto space-y-4">

          {/* Title */}
          <div>
            <label className={labelClass}>
              Title <span className="text-slate-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
              placeholder={TITLE_PLACEHOLDERS[mode]}
              maxLength={60}
              className={inputClass}
            />
          </div>

          {/* Save to Capsule */}
          <div>
            <label className={labelClass}>
              Save to Capsule
            </label>
            <select
              value={selectedCapsuleId}
              onChange={e => setSelectedCapsuleId(e.target.value)}
              className={`${inputClass} [color-scheme:dark]`}
            >
              {capsules.length === 0 && (
                <option value="" disabled>No capsules yet</option>
              )}
              {capsules.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Creator */}
          <div>
            <label className={labelClass}>
              Artist / Author / Recipient
            </label>
            <input
              type="text"
              value={creator}
              onChange={e => setCreator(e.target.value)}
              placeholder="e.g. Grandma Rose"
              maxLength={80}
              className={inputClass}
            />
          </div>

          {/* Date */}
          <div>
            <label className={labelClass}>
              Date
            </label>
            <input
              type="date"
              value={captureDate}
              onChange={e => setCaptureDate(e.target.value)}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </div>

          {/* Time */}
          <div>
            <label className={labelClass}>
              Time
            </label>
            <input
              type="time"
              value={captureTime}
              onChange={e => setCaptureTime(e.target.value)}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </div>

          {/* Location */}
          <div>
            <label className={labelClass}>
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. London, UK"
              maxLength={80}
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional — add any notes about this memory."
              maxLength={300}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

        </div>
      </div>

      {/* Footer — fixed CTA */}
      <div className="flex-shrink-0 px-6 pb-8 pt-3 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent">
        <div className="w-full max-w-sm mx-auto space-y-3">
          <button
            onClick={handleConfirm}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 bg-slate-500 hover:bg-slate-400 active:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm shadow-slate-500/20"
          >
            {isUploading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isUploading ? 'Compressing & Saving...' : title.trim() ? 'Save & Continue' : 'Continue'}
          </button>
          <button
            onClick={() => onConfirm({ capsuleId: selectedCapsuleId || undefined })}
            disabled={isUploading}
            className="w-full text-zinc-500 hover:text-zinc-400 text-sm py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip naming
          </button>
        </div>
      </div>
    </div>
  )
}
