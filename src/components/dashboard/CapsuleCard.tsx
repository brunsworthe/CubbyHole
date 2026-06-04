'use client'

import { Box, Share2 } from 'lucide-react'
import PrivacyBadge from '@/components/ui/PrivacyBadge'
import type { Capsule } from '@/types/dashboard'

interface Props {
  capsule: Capsule
  isOwnProfile: boolean
  onView: (capsule: Capsule) => void
  onShare: (capsule: Capsule) => void
  onHover: (capsule: Capsule) => void
}

export default function CapsuleCard({ capsule, isOwnProfile, onView, onShare, onHover }: Props) {
  return (
    <div
      className="
        group relative flex flex-col rounded-2xl overflow-hidden
        bg-white dark:bg-zinc-900
        border border-slate-200 dark:border-zinc-800
        hover:border-slate-300 dark:hover:border-zinc-700
        hover:shadow-lg hover:shadow-black/8 dark:hover:shadow-black/50
        hover:-translate-y-0.5
        transition-all duration-300
      "
      onMouseEnter={() => onHover(capsule)}
    >
      {/* ── Thumbnail ── */}
      <div
        className={`relative h-44 flex items-center justify-center overflow-hidden cursor-pointer
          bg-gradient-to-br ${capsule.accentFrom} ${capsule.accentVia}
          to-slate-50 dark:to-zinc-950
        `}
        onClick={() => onView(capsule)}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,1) 1px,transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Privacy badge — top left */}
        <div className="absolute top-3 left-3 z-10">
          <PrivacyBadge tier={capsule.visibilityTier} />
        </div>

        {/* 3D placeholder icon */}
        <div className="
          z-10 w-16 h-16 rounded-2xl flex items-center justify-center
          bg-black/5 dark:bg-white/5
          border border-black/8 dark:border-white/10
          text-slate-400 dark:text-white/25
          group-hover:scale-110
          group-hover:text-slate-500 dark:group-hover:text-white/40
          group-hover:border-black/12 dark:group-hover:border-white/20
          transition-all duration-300
        ">
          <Box className="w-8 h-8" />
        </div>

        {/* Hover overlay */}
        <div className="
          absolute inset-0 flex flex-col items-center justify-center gap-2.5
          bg-white/60 dark:bg-zinc-950/70
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200 backdrop-blur-[2px]
        ">
          <button
            onClick={(e) => { e.stopPropagation(); onView(capsule) }}
            className="
              flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide
              bg-slate-900/90 dark:bg-white/10
              border border-slate-700/50 dark:border-white/10
              hover:bg-slate-900 dark:hover:bg-white/20
              text-white
              transition-all backdrop-blur-sm
            "
          >
            <Box className="w-3.5 h-3.5" />
            View in 3D
          </button>
          {isOwnProfile && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(capsule) }}
              className="
                flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide
                bg-amber-500/15 dark:bg-amber-400/15
                border border-amber-500/30 dark:border-amber-400/25
                hover:bg-amber-500/25 dark:hover:bg-amber-400/25
                text-amber-700 dark:text-amber-300
                transition-all backdrop-blur-sm
              "
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Settings
            </button>
          )}
        </div>
      </div>

      {/* ── Card footer ── */}
      <div className="px-4 py-3 flex items-center justify-between gap-2 min-h-0">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate leading-snug">
            {capsule.title}
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{capsule.capturedAt}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="
            text-xs font-medium px-2.5 py-0.5 rounded-full
            bg-slate-100 dark:bg-zinc-800
            text-slate-600 dark:text-zinc-400
            border border-slate-200 dark:border-zinc-700/80
          ">
            {capsule.childName}
          </span>
          {isOwnProfile && (
            <button
              onClick={() => onShare(capsule)}
              className="
                w-7 h-7 rounded-lg flex items-center justify-center
                text-slate-400 dark:text-zinc-600
                hover:text-amber-600 dark:hover:text-amber-400
                hover:bg-amber-50 dark:hover:bg-zinc-800
                transition-all duration-150
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400
              "
              title="Share settings"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
