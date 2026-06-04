'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Lock, Users, SlidersHorizontal, Link2, Copy, Check, X, ChevronDown,
} from 'lucide-react'
import PrivacyBadge from '@/components/ui/PrivacyBadge'
import type { Capsule, HouseholdLink, VisibilityTier } from '@/types/dashboard'

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`
        relative rounded-full transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
        focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900
        ${checked
          ? 'bg-amber-500 dark:bg-amber-400'
          : 'bg-slate-200 dark:bg-zinc-700'
        }
      `}
      style={{ width: 40, height: 22 }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ width: 18, height: 18, transform: checked ? 'translateX(20px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

// ── Tier option row ───────────────────────────────────────────────────────────

type TierOption = {
  id: VisibilityTier
  Icon: React.ComponentType<{ className?: string }>
  label: string
  desc: string
}

const TIER_OPTIONS: TierOption[] = [
  { id: 'private',  Icon: Lock,              label: 'Private',             desc: 'Only visible to your household' },
  { id: 'linked',   Icon: Users,             label: 'Shared with Network', desc: 'All active linked families can view' },
  { id: 'custom',   Icon: SlidersHorizontal, label: 'Custom',              desc: 'Choose exactly who can view' },
]

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  capsule: Capsule
  linkedFamilies: HouseholdLink[]
  onClose: () => void
  onSave: (capsuleId: string, tier: VisibilityTier, grants: string[]) => void
}

export default function ShareSettingsModal({ capsule, linkedFamilies, onClose, onSave }: Props) {
  const [tier, setTier] = useState<VisibilityTier>(capsule.visibilityTier)
  const [grants, setGrants] = useState(new Set(capsule.customGrants))
  const [guestLink, setGuestLink] = useState<{ token: string; expiryHours: number } | null>(null)
  const [expiryHours, setExpiryHours] = useState(24)
  const [copied, setCopied] = useState(false)

  const close = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [close])

  const toggleGrant = (id: string) =>
    setGrants((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleGenerateLink = () => {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    setGuestLink({ token, expiryHours })
  }

  const handleCopy = async () => {
    if (!guestLink) return
    await navigator.clipboard.writeText(`https://cubbyhole.app/share/${guestLink.token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeFamilies  = linkedFamilies.filter((f) => f.status === 'active')
  const pendingFamilies = linkedFamilies.filter((f) => f.status === 'pending')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="
        relative w-full sm:max-w-md flex flex-col
        bg-white dark:bg-zinc-900
        border-t sm:border border-slate-200 dark:border-zinc-800
        sm:rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/60
        max-h-[92dvh] sm:max-h-[85vh]
      ">
        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">Share Settings</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-sm text-slate-500 dark:text-zinc-400">{capsule.title}</span>
              <span className="text-slate-300 dark:text-zinc-700">·</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                {capsule.childName}
              </span>
              <PrivacyBadge tier={tier} size="sm" />
            </div>
          </div>
          <button
            onClick={close}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">

          {/* ── Visibility tier ── */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2.5">
              Visibility
            </p>
            <div className="space-y-2">
              {TIER_OPTIONS.map(({ id, Icon, label, desc }) => (
                <button
                  key={id}
                  onClick={() => setTier(id)}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150
                    ${tier === id
                      ? 'bg-amber-50 dark:bg-amber-400/8 border-amber-300 dark:border-amber-400/30 ring-1 ring-amber-300/60 dark:ring-amber-400/20'
                      : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                    }
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                    ${tier === id
                      ? 'bg-amber-500/15 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400'
                      : 'bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400'
                    }
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${tier === id ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-700 dark:text-zinc-300'}`}>
                      {label}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{desc}</p>
                  </div>
                  <div className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                    ${tier === id
                      ? 'border-amber-500 dark:border-amber-400 bg-amber-500 dark:bg-amber-400'
                      : 'border-slate-300 dark:border-zinc-600 bg-transparent'
                    }
                  `}>
                    {tier === id && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-950" />}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* ── Custom family access ── */}
          {tier === 'custom' && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2.5">
                Family Access
              </p>
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800">
                {activeFamilies.map((family) => (
                  <div
                    key={family.id}
                    className="flex items-center gap-3 px-3.5 py-3 bg-white dark:bg-zinc-800/30 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full ${family.colorClass} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {family.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-zinc-200 truncate">{family.familyName}</p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">{family.email}</p>
                    </div>
                    <Toggle checked={grants.has(family.id)} onChange={() => toggleGrant(family.id)} />
                  </div>
                ))}
                {pendingFamilies.map((family) => (
                  <div key={family.id} className="flex items-center gap-3 px-3.5 py-3 bg-slate-50/50 dark:bg-zinc-800/20 opacity-50">
                    <div className={`w-8 h-8 rounded-full ${family.colorClass} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {family.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 truncate">{family.familyName}</p>
                      <p className="text-xs text-slate-400 dark:text-zinc-600 truncate">Invitation pending</p>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700">
                      Pending
                    </span>
                  </div>
                ))}
                {activeFamilies.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-zinc-600 px-3.5 py-4 text-center">No active family connections yet.</p>
                )}
              </div>
              {grants.size > 0 && (
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 pl-1">
                  {grants.size} {grants.size === 1 ? 'family has' : 'families have'} access to this item.
                </p>
              )}
            </section>
          )}

          {/* ── Guest link ── */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2.5">
              Guest Link
            </p>
            {!guestLink ? (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/30 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 flex-shrink-0 mt-0.5">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">One-time share link</p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Anyone with this link can view — no account needed.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(Number(e.target.value))}
                      className="
                        w-full appearance-none
                        bg-white dark:bg-zinc-900
                        border border-slate-300 dark:border-zinc-700
                        text-slate-700 dark:text-zinc-300
                        text-xs rounded-lg px-3 py-2 pr-8
                        focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400/50
                      "
                    >
                      <option value={24}>Expires in 24 hours</option>
                      <option value={48}>Expires in 48 hours</option>
                      <option value={168}>Expires in 7 days</option>
                      <option value={720}>Expires in 30 days</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                  </div>
                  <button
                    onClick={handleGenerateLink}
                    className="
                      flex-shrink-0 px-4 py-2 rounded-lg text-xs font-semibold
                      bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600
                      text-slate-700 dark:text-zinc-200
                      border border-slate-300 dark:border-zinc-600
                      transition-colors
                    "
                  >
                    Generate
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-300/60 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/5 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                    Link active
                  </span>
                  <span className="text-xs text-slate-400 dark:text-zinc-500">
                    Expires in {guestLink.expiryHours < 48 ? `${guestLink.expiryHours}h` : `${guestLink.expiryHours / 24}d`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="
                    flex-1 text-xs font-mono truncate
                    bg-white dark:bg-zinc-900
                    border border-slate-200 dark:border-zinc-700
                    text-slate-700 dark:text-zinc-300
                    rounded-lg px-3 py-2
                  ">
                    cubbyhole.app/share/{guestLink.token}
                  </code>
                  <button
                    onClick={handleCopy}
                    className={`
                      flex-shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200
                      ${copied
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600 hover:text-slate-800 dark:hover:text-zinc-200'
                      }
                    `}
                    title="Copy link"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  onClick={() => setGuestLink(null)}
                  className="text-xs text-rose-500/70 dark:text-rose-400/70 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  Revoke this link
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2.5 px-5 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900">
          <button
            onClick={close}
            className="
              px-4 py-2 rounded-lg text-sm font-medium
              text-slate-600 dark:text-zinc-400
              hover:text-slate-900 dark:hover:text-zinc-200
              hover:bg-slate-100 dark:hover:bg-zinc-800
              border border-transparent hover:border-slate-200 dark:hover:border-zinc-700
              transition-all
            "
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(capsule.id, tier, Array.from(grants)); onClose() }}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-zinc-950 transition-colors shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
