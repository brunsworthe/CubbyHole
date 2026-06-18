'use client'

import { Plus } from 'lucide-react'
import type { HouseholdLink } from '@/types/dashboard'

interface Props {
  activeProfileId: string
  linkedFamilies: HouseholdLink[]
  onSelect: (profileId: string) => void
  onOpenLinkPanel: () => void
}

export default function ProfileSelector({ activeProfileId, linkedFamilies, onSelect, onOpenLinkPanel }: Props) {
  const activeFamilies = linkedFamilies.filter((f) => f.status === 'active')

  const tabBase = `
    flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium
    transition-all duration-200 focus-visible:outline-none focus-visible:ring-2
    focus-visible:ring-slate-400
  `
  const tabActive = `
    bg-white dark:bg-zinc-800
    border-slate-300 dark:border-zinc-700
    text-slate-900 dark:text-zinc-100
    shadow-sm dark:shadow-md dark:shadow-black/30
  `
  const tabInactive = `
    bg-slate-50/60 dark:bg-zinc-900/60
    border-slate-200 dark:border-zinc-800
    text-slate-500 dark:text-zinc-500
    hover:text-slate-700 dark:hover:text-zinc-300
    hover:border-slate-300 dark:hover:border-zinc-700
    hover:bg-white dark:hover:bg-zinc-800/60
  `

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mb-1">
      {/* My Family */}
      <button
        onClick={() => onSelect('own')}
        className={`${tabBase} ${activeProfileId === 'own' ? tabActive : tabInactive}`}
      >
        <span className={`
          w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
          transition-colors
          ${activeProfileId === 'own'
            ? 'bg-slate-500 dark:bg-slate-400 text-white dark:text-zinc-950'
            : 'bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400'}
        `}>
          H
        </span>
        <span>My Family</span>
        {activeProfileId === 'own' && (
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-400 ml-0.5" />
        )}
      </button>

      {/* Active linked families */}
      {activeFamilies.map((family) => (
        <button
          key={family.id}
          onClick={() => onSelect(family.id)}
          className={`${tabBase} ${activeProfileId === family.id ? tabActive : tabInactive}`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${family.colorClass} text-white`}>
            {family.initials.slice(0, 1)}
          </span>
          <span className="max-w-[120px] truncate">{family.familyName}</span>
          {activeProfileId === family.id && (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-400 ml-0.5" />
          )}
        </button>
      ))}

      {/* Add household */}
      <button
        onClick={onOpenLinkPanel}
        title="Link a new household"
        className={`
          flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed
          text-xs font-medium transition-all duration-200
          border-slate-300 dark:border-zinc-700
          text-slate-400 dark:text-zinc-600
          hover:text-slate-600 dark:hover:text-zinc-400
          hover:border-slate-400 dark:hover:border-zinc-600
          hover:bg-slate-50 dark:hover:bg-zinc-900
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400
        `}
      >
        <Plus className="w-3.5 h-3.5" />
        Link Family
      </button>
    </div>
  )
}
