'use client'

import { Lock, Users, SlidersHorizontal } from 'lucide-react'
import type { VisibilityTier } from '@/types/dashboard'

const TIER_CONFIG: Record<
  VisibilityTier,
  { label: string; Icon: React.ComponentType<{ className?: string }>; light: string; dark: string }
> = {
  private: {
    label: 'Private',
    Icon: Lock,
    light: 'bg-rose-50 text-rose-600 border-rose-200',
    dark:  'dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-900/50',
  },
  linked: {
    label: 'Shared',
    Icon: Users,
    light: 'bg-sky-50 text-sky-600 border-sky-200',
    dark:  'dark:bg-sky-950/80 dark:text-sky-400 dark:border-sky-900/50',
  },
  custom: {
    label: 'Custom',
    Icon: SlidersHorizontal,
    light: 'bg-amber-50 text-amber-600 border-amber-200',
    dark:  'dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-900/50',
  },
}

interface Props {
  tier: VisibilityTier
  size?: 'sm' | 'md'
}

export default function PrivacyBadge({ tier, size = 'sm' }: Props) {
  const { label, Icon, light, dark } = TIER_CONFIG[tier]
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium backdrop-blur-sm
        ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}
        ${light} ${dark}
      `}
    >
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {label}
    </span>
  )
}
