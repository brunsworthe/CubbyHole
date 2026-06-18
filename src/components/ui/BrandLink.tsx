'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
  showBack?: boolean
}

export default function BrandLink({ showBack = false }: Props) {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 flex-shrink-0 group"
      aria-label="CubbyHole — back to dashboard"
    >
      {showBack && (
        <ArrowLeft className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors flex-shrink-0" />
      )}
      <div className="w-10 h-6 rounded-sm bg-slate-500/15 dark:bg-slate-400/15 flex items-center justify-center group-hover:bg-slate-500/25 dark:group-hover:bg-slate-400/20 transition-colors overflow-hidden">
        <svg
          viewBox="0 0 40 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="cubbyFadeRed" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fefefe" />
              <stop offset="85%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#ef4444" />
            </radialGradient>
            <radialGradient id="cubbyFadeSky" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fefefe" />
              <stop offset="85%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </radialGradient>
            <radialGradient id="cubbyFadeAmber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fefefe" />
              <stop offset="85%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#fde047" />
            </radialGradient>
            <radialGradient id="cubbyFadeGreen" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fefefe" />
              <stop offset="85%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#4ade80" />
            </radialGradient>
            <radialGradient id="cubbyFadeViolet" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fefefe" />
              <stop offset="85%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </radialGradient>
          </defs>
          {/* wood frame — rounded corners clipped by container */}
          <rect width="40" height="24" fill="#b45309" />
          {/* red column — leftmost */}
          <rect x="2"    y="2"  width="6" height="9" fill="url(#cubbyFadeRed)" />
          <rect x="2"    y="13" width="6" height="9" fill="url(#cubbyFadeRed)" />
          {/* sky-blue column */}
          <rect x="9.5"  y="2"  width="6" height="9" fill="url(#cubbyFadeSky)" />
          <rect x="9.5"  y="13" width="6" height="9" fill="url(#cubbyFadeSky)" />
          {/* amber column */}
          <rect x="17"   y="2"  width="6" height="9" fill="url(#cubbyFadeAmber)" />
          <rect x="17"   y="13" width="6" height="9" fill="url(#cubbyFadeAmber)" />
          {/* light green column */}
          <rect x="24.5" y="2"  width="6" height="9" fill="url(#cubbyFadeGreen)" />
          <rect x="24.5" y="13" width="6" height="9" fill="url(#cubbyFadeGreen)" />
          {/* violet column — rightmost */}
          <rect x="32"   y="2"  width="6" height="9" fill="url(#cubbyFadeViolet)" />
          <rect x="32"   y="13" width="6" height="9" fill="url(#cubbyFadeViolet)" />
        </svg>
      </div>
      <span className="font-bold text-base tracking-tight lowercase text-slate-900 dark:text-zinc-100 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
        CubbyHole
      </span>
    </Link>
  )
}
