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
        <ArrowLeft className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors flex-shrink-0" />
      )}
      <div className="w-10 h-6 rounded-lg bg-amber-500/15 dark:bg-amber-400/15 flex items-center justify-center group-hover:bg-amber-500/25 dark:group-hover:bg-amber-400/20 transition-colors overflow-hidden">
        <svg
          viewBox="0 0 40 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-hidden="true"
        >
          {/* wood frame — rounded corners clipped by container */}
          <rect width="40" height="24" fill="#92400e" />
          {/* red column — leftmost */}
          <rect x="2"    y="2"  width="6" height="9" fill="#f87171" />
          <rect x="2"    y="13" width="6" height="9" fill="#f87171" />
          {/* sky-blue column */}
          <rect x="9.5"  y="2"  width="6" height="9" fill="#38bdf8" />
          <rect x="9.5"  y="13" width="6" height="9" fill="#38bdf8" />
          {/* amber column */}
          <rect x="17"   y="2"  width="6" height="9" fill="#fbbf24" />
          <rect x="17"   y="13" width="6" height="9" fill="#fbbf24" />
          {/* light green column */}
          <rect x="24.5" y="2"  width="6" height="9" fill="#86efac" />
          <rect x="24.5" y="13" width="6" height="9" fill="#86efac" />
          {/* violet column — rightmost */}
          <rect x="32"   y="2"  width="6" height="9" fill="#a78bfa" />
          <rect x="32"   y="13" width="6" height="9" fill="#a78bfa" />
        </svg>
      </div>
      <span className="font-bold text-base tracking-tight lowercase text-slate-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
        CubbyHole
      </span>
    </Link>
  )
}
