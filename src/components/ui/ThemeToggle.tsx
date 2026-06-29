'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  // Prevent hydration mismatch — don't render the icon until we know the theme
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  if (!mounted) {
    return <div className="w-9 h-9 rounded-xl" aria-hidden="true" />
  }

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        relative w-9 h-9 rounded-xl flex items-center justify-center
        border transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2
        focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950
        bg-slate-100 hover:bg-slate-200 border-slate-200 hover:border-slate-300
        dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-600
        text-slate-600 dark:text-zinc-400
        hover:text-slate-900 dark:hover:text-zinc-100
      `}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform duration-300 rotate-0" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-300 rotate-0" />
      )}
    </button>
  )
}
