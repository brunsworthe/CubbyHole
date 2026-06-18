'use client'

import { useId } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
  showBack?: boolean
}

export default function BrandLink({ showBack = false }: Props) {
  const grainId = useId()

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
          {/* wood frame — rounded corners clipped by container */}
          <defs>
            <pattern id={grainId} width="8" height="24" patternUnits="userSpaceOnUse">
              <rect width="8" height="24" fill="#8b5e3c" />
              <path d="M1   0 Q2.5 4  1.5 8  Q0.5 12 2   16 Q3   20 1.2 24" stroke="#6b4226" strokeWidth="0.4"  fill="none" opacity="0.5" />
              <path d="M4.5 0 Q3   5  4.8 9  Q6   13 4.2 17 Q3   21 4.8 24" stroke="#a87b52" strokeWidth="0.35" fill="none" opacity="0.4" />
              <path d="M6.8 0 Q7.6 4  6.5 9  Q5.8 14 7.2 18 Q7.8 21 6.6 24" stroke="#6b4226" strokeWidth="0.3"  fill="none" opacity="0.35" />
            </pattern>
          </defs>
          <rect width="40" height="24" fill={`url(#${grainId})`} />
          {/* red column — leftmost — nested rects fade rectangularly to match the box shape */}
          <rect x="2"   y="2"    width="6"   height="9"   fill="#ef4444" />
          <rect x="2.6" y="2.9"  width="4.8" height="7.2" fill="#f87171" />
          <rect x="3.5" y="4.25" width="3"   height="4.5" fill="#fefefe" />
          <rect x="2"   y="13"   width="6"   height="9"   fill="#ef4444" />
          <rect x="2.6" y="13.9" width="4.8" height="7.2" fill="#f87171" />
          <rect x="3.5" y="15.25" width="3"  height="4.5" fill="#fefefe" />
          {/* sky-blue column */}
          <rect x="9.5"  y="2"    width="6"   height="9"   fill="#0ea5e9" />
          <rect x="10.1" y="2.9"  width="4.8" height="7.2" fill="#38bdf8" />
          <rect x="11"   y="4.25" width="3"   height="4.5" fill="#fefefe" />
          <rect x="9.5"  y="13"   width="6"   height="9"   fill="#0ea5e9" />
          <rect x="10.1" y="13.9" width="4.8" height="7.2" fill="#38bdf8" />
          <rect x="11"   y="15.25" width="3"  height="4.5" fill="#fefefe" />
          {/* amber column */}
          <rect x="17"   y="2"    width="6"   height="9"   fill="#fde047" />
          <rect x="17.6" y="2.9"  width="4.8" height="7.2" fill="#fef08a" />
          <rect x="18.5" y="4.25" width="3"   height="4.5" fill="#fefefe" />
          <rect x="17"   y="13"   width="6"   height="9"   fill="#fde047" />
          <rect x="17.6" y="13.9" width="4.8" height="7.2" fill="#fef08a" />
          <rect x="18.5" y="15.25" width="3"  height="4.5" fill="#fefefe" />
          {/* light green column */}
          <rect x="24.5" y="2"    width="6"   height="9"   fill="#4ade80" />
          <rect x="25.1" y="2.9"  width="4.8" height="7.2" fill="#86efac" />
          <rect x="26"   y="4.25" width="3"   height="4.5" fill="#fefefe" />
          <rect x="24.5" y="13"   width="6"   height="9"   fill="#4ade80" />
          <rect x="25.1" y="13.9" width="4.8" height="7.2" fill="#86efac" />
          <rect x="26"   y="15.25" width="3"  height="4.5" fill="#fefefe" />
          {/* violet column — rightmost */}
          <rect x="32"   y="2"    width="6"   height="9"   fill="#8b5cf6" />
          <rect x="32.6" y="2.9"  width="4.8" height="7.2" fill="#a78bfa" />
          <rect x="33.5" y="4.25" width="3"   height="4.5" fill="#fefefe" />
          <rect x="32"   y="13"   width="6"   height="9"   fill="#8b5cf6" />
          <rect x="32.6" y="13.9" width="4.8" height="7.2" fill="#a78bfa" />
          <rect x="33.5" y="15.25" width="3"  height="4.5" fill="#fefefe" />
        </svg>
      </div>
      <span className="font-bold text-base tracking-tight lowercase text-slate-900 dark:text-zinc-100 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
        CubbyHole
      </span>
    </Link>
  )
}
