'use client'

import Link from 'next/link'
import { Box, ArrowLeft } from 'lucide-react'

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
      <div className="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/25 dark:border-amber-400/25 flex items-center justify-center group-hover:bg-amber-500/25 dark:group-hover:bg-amber-400/20 transition-colors">
        <Box className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
      </div>
      <span className="font-bold text-base tracking-tight lowercase text-slate-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
        CubbyHole
      </span>
    </Link>
  )
}
