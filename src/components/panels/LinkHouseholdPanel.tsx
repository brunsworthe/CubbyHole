'use client'

import { useState, useEffect, useCallback } from 'react'
import { Mail, Link2, Unlink, X, Plus } from 'lucide-react'
import type { HouseholdLink } from '@/types/dashboard'

interface SentInvite {
  id: string
  email: string
  familyName: string
  sentAt: Date
}

interface Props {
  connections: HouseholdLink[]
  onAddConnection: (familyName: string, email: string) => void
  onClose: () => void
}

export default function LinkHouseholdPanel({ connections, onAddConnection, onClose }: Props) {
  const [familyNameInput, setFamilyNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([])
  const [emailError, setEmailError] = useState('')
  const [justSent, setJustSent] = useState(false)

  const close = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [close])

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleSend = () => {
    if (!familyNameInput.trim()) { setEmailError('Please enter a family name.'); return }
    if (!isValidEmail(emailInput)) { setEmailError('Please enter a valid email address.'); return }
    setEmailError('')
    setSentInvites((prev) => [
      { id: Date.now().toString(), email: emailInput.trim(), familyName: familyNameInput.trim(), sentAt: new Date() },
      ...prev,
    ])
    onAddConnection(familyNameInput.trim(), emailInput.trim())
    setFamilyNameInput('')
    setEmailInput('')
    setJustSent(true)
    setTimeout(() => setJustSent(false), 2500)
  }

  const activeConnections  = connections.filter((c) => c.status === 'active')
  const pendingConnections = connections.filter((c) => c.status === 'pending')

  const inputClass = `
    w-full text-sm rounded-xl px-3.5 py-2.5 transition-all
    bg-white dark:bg-zinc-800/80
    border border-slate-300 dark:border-zinc-700
    text-slate-900 dark:text-zinc-100
    placeholder:text-slate-400 dark:placeholder:text-zinc-600
    focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400/50
  `

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Drawer */}
      <div className="relative w-full sm:w-96 h-full flex flex-col bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl shadow-black/10 dark:shadow-black/60">

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">Linked Households</h2>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                {activeConnections.length} active connection{activeConnections.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* Invite form */}
          <div className="px-5 py-5 border-b border-slate-100 dark:border-zinc-800">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-3">
              Invite a Family
            </p>
            <div className="space-y-2.5">
              <input
                type="text"
                value={familyNameInput}
                onChange={(e) => { setFamilyNameInput(e.target.value); setEmailError('') }}
                placeholder="Family name (e.g. The Smiths)"
                className={inputClass}
              />
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); setEmailError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                  placeholder="their@email.com"
                  className={`${inputClass} pl-10`}
                />
              </div>
              {emailError && <p className="text-xs text-rose-500 dark:text-rose-400 pl-1">{emailError}</p>}
              <button
                onClick={handleSend}
                disabled={!emailInput || !familyNameInput}
                className="
                  w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed
                  bg-amber-500 hover:bg-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300
                  text-white dark:text-zinc-950
                  disabled:hover:bg-amber-500 dark:disabled:hover:bg-amber-400
                "
              >
                {justSent ? (
                  <><span className="text-sm">✓</span> Invitation sent!</>
                ) : (
                  <><Plus className="w-4 h-4" /> Send Invitation</>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-zinc-600 mt-3">
              They'll receive an email to link their CubbyHole account with yours.
            </p>
          </div>

          {/* Active connections */}
          {activeConnections.length > 0 && (
            <div className="px-5 py-5 border-b border-slate-100 dark:border-zinc-800">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-3">Active</p>
              <div className="space-y-2">
                {activeConnections.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group"
                  >
                    <div className={`w-9 h-9 rounded-full ${c.colorClass} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {c.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-zinc-200 truncate">{c.familyName}</p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                        Active
                      </span>
                      <button
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all"
                        title="Disconnect"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {(pendingConnections.length > 0 || sentInvites.length > 0) && (
            <div className="px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-3">Pending</p>
              <div className="space-y-2">
                {pendingConnections.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/60 dark:bg-zinc-800/20 border border-slate-100 dark:border-zinc-800/60">
                    <div className={`w-9 h-9 rounded-full ${c.colorClass} opacity-60 flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {c.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 truncate">{c.familyName}</p>
                      <p className="text-xs text-slate-400 dark:text-zinc-600 truncate">{c.email}</p>
                    </div>
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 px-1.5 py-0.5 rounded-full">
                      Pending
                    </span>
                  </div>
                ))}
                {sentInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/60 dark:bg-zinc-800/20 border border-slate-100 dark:border-zinc-800/60">
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 flex-shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 truncate">{inv.familyName}</p>
                      <p className="text-xs text-slate-400 dark:text-zinc-600 truncate">{inv.email}</p>
                    </div>
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 px-1.5 py-0.5 rounded-full">
                      Invited
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {activeConnections.length === 0 && pendingConnections.length === 0 && sentInvites.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-4">
                <Link2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">No connections yet</p>
              <p className="text-xs text-slate-400 dark:text-zinc-600 mt-1">
                Invite grandparents, relatives, or close family friends above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
