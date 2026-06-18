'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight, Loader2, Inbox, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Message = { type: 'success' | 'error'; text: string }

export default function LoginPage() {
  const router = useRouter()

  const [isMagicLinkMode, setIsMagicLinkMode] = useState(false)
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [message,         setMessage]         = useState<Message | null>(null)
  const [magicLinkSent,   setMagicLinkSent]   = useState(false)

  // ── Password flow ────────────────────────────────────────────────────────────

  const handleSignIn = async () => {
    if (!email)    return setMessage({ type: 'error', text: 'Please enter your email address.' })
    if (!password) return setMessage({ type: 'error', text: 'Please enter your password.' })

    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const handleSignUp = async () => {
    if (!email)    return setMessage({ type: 'error', text: 'Please enter your email address.' })
    if (!password) return setMessage({ type: 'error', text: 'Please choose a password.' })
    if (password.length < 6)
      return setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })

    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signUp({ email, password })

    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({
        type: 'success',
        text: 'Account created! Check your email to confirm your address, then sign in.',
      })
    }
  }

  // ── Magic link flow ──────────────────────────────────────────────────────────

  const handleMagicLink = async () => {
    if (!email) return setMessage({ type: 'error', text: 'Please enter your email address.' })

    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Supabase will redirect here after the user clicks the link.
        // Make sure this URL is allow-listed in your Supabase Auth settings.
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setEmail('')
      setMagicLinkSent(true)
    }
  }

  // ── Mode toggle ──────────────────────────────────────────────────────────────

  const switchMode = () => {
    setIsMagicLinkMode(m => !m)
    setMessage(null)
    setMagicLinkSent(false)
    setPassword('')
  }

  // ── Shared class strings (match NamingScreen conventions) ────────────────────

  const inputClass =
    'w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:border-slate-500/70 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 text-sm outline-none transition-colors'

  const labelClass =
    'block text-slate-500 dark:text-zinc-400 text-xs font-medium mb-1.5 tracking-wider uppercase'

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">

      {/* Ambient amber glow — matches the rest of the app */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(251,191,36,0.06) 0%, transparent 70%)',
        }}
      />

      {/* ── Content ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-sm">

        {/* ── Wordmark ──────────────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-28 h-[67.2px] rounded-sm overflow-hidden">
              <svg
                viewBox="0 0 40 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="cubbyFadeRedLg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fefefe" />
                    <stop offset="85%" stopColor="#f87171" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </radialGradient>
                  <radialGradient id="cubbyFadeSkyLg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fefefe" />
                    <stop offset="85%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </radialGradient>
                  <radialGradient id="cubbyFadeAmberLg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fefefe" />
                    <stop offset="85%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#fde047" />
                  </radialGradient>
                  <radialGradient id="cubbyFadeGreenLg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fefefe" />
                    <stop offset="85%" stopColor="#86efac" />
                    <stop offset="100%" stopColor="#4ade80" />
                  </radialGradient>
                  <radialGradient id="cubbyFadeVioletLg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fefefe" />
                    <stop offset="85%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </radialGradient>
                </defs>
                {/* wood frame */}
                <rect width="40" height="24" fill="#b45309" />
                {/* red column — leftmost */}
                <rect x="2"    y="2"  width="6" height="9" fill="url(#cubbyFadeRedLg)" />
                <rect x="2"    y="13" width="6" height="9" fill="url(#cubbyFadeRedLg)" />
                {/* sky-blue column */}
                <rect x="9.5"  y="2"  width="6" height="9" fill="url(#cubbyFadeSkyLg)" />
                <rect x="9.5"  y="13" width="6" height="9" fill="url(#cubbyFadeSkyLg)" />
                {/* amber column */}
                <rect x="17"   y="2"  width="6" height="9" fill="url(#cubbyFadeAmberLg)" />
                <rect x="17"   y="13" width="6" height="9" fill="url(#cubbyFadeAmberLg)" />
                {/* light green column */}
                <rect x="24.5" y="2"  width="6" height="9" fill="url(#cubbyFadeGreenLg)" />
                <rect x="24.5" y="13" width="6" height="9" fill="url(#cubbyFadeGreenLg)" />
                {/* violet column — rightmost */}
                <rect x="32"   y="2"  width="6" height="9" fill="url(#cubbyFadeVioletLg)" />
                <rect x="32"   y="13" width="6" height="9" fill="url(#cubbyFadeVioletLg)" />
              </svg>
            </div>
          </div>
          <h1 className="text-slate-900 dark:text-white font-bold text-2xl tracking-tight lowercase">CubbyHole</h1>
          <p className="text-slate-500 dark:text-zinc-500 text-sm mt-1">A home for your family&apos;s memories</p>
        </div>

        {/* ── Card ──────────────────────────────────────────────────────────── */}
        <div className="bg-white/80 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl shadow-black/5 dark:shadow-2xl backdrop-blur-sm">

          {/* Magic link sent confirmation */}
          {magicLinkSent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-500/10 rounded-2xl ring-1 ring-slate-500/20 mb-5">
                <Inbox className="w-7 h-7 text-slate-600 dark:text-slate-400" />
              </div>
              <h2 className="text-slate-900 dark:text-white font-semibold text-lg mb-2">Check your inbox</h2>
              <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                We sent a sign-in link to your email address. Tap it from any device to open
                your vault — no password needed.
              </p>
              <button
                onClick={switchMode}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 text-sm transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Heading */}
              <h2 className="text-slate-900 dark:text-white font-semibold text-lg mb-1">
                {isMagicLinkMode ? 'Send a magic link' : 'Welcome back'}
              </h2>
              <p className="text-slate-500 dark:text-zinc-500 text-sm mb-6">
                {isMagicLinkMode
                  ? "We'll email you a one-tap link — no password needed."
                  : 'Sign in to your parent account.'}
              </p>

              <div className="space-y-4">

                {/* Email field */}
                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-600 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => {
                        if (e.key !== 'Enter') return
                        isMagicLinkMode ? handleMagicLink() : handleSignIn()
                      }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>

                {/* Password field — password mode only */}
                {!isMagicLinkMode && (
                  <div>
                    <label className={labelClass}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-600 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSignIn() }}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className={`${inputClass} pl-10 pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        tabIndex={-1}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-400 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword
                          ? <EyeOff className="w-4 h-4" />
                          : <Eye    className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Feedback toast */}
                {message && (
                  <div
                    role="alert"
                    className={`rounded-xl px-4 py-3 text-sm leading-snug ${
                      message.type === 'error'
                        ? 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
                        : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                {/* Primary actions */}
                {isMagicLinkMode ? (

                  <button
                    onClick={handleMagicLink}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-slate-500 hover:bg-slate-400 active:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm shadow-slate-500/20"
                  >
                    {loading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending link…</>
                      : <><Mail    className="w-4 h-4" />              Send Magic Link</>}
                  </button>

                ) : (

                  <div className="space-y-2.5">
                    {/* Sign In */}
                    <button
                      onClick={handleSignIn}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-slate-500 hover:bg-slate-400 active:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm shadow-slate-500/20"
                    >
                      {loading
                        ? <><Loader2    className="w-4 h-4 animate-spin" /> Signing in…</>
                        : <><ArrowRight className="w-4 h-4" />             Sign In</>}
                    </button>

                    {/* Create Account */}
                    <button
                      onClick={handleSignUp}
                      disabled={loading}
                      className="w-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 active:bg-slate-300 dark:active:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-zinc-200 font-medium py-3.5 rounded-xl transition-colors border border-slate-200 dark:border-zinc-700"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating account…</>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </div>

                )}
              </div>

              {/* Mode toggle link */}
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-zinc-800 text-center">
                <button
                  onClick={switchMode}
                  disabled={loading}
                  className="text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 text-sm transition-colors disabled:opacity-40"
                >
                  {isMagicLinkMode
                    ? 'Wait, I have a password →'
                    : 'Forgot your password? Send me a magic link instead →'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Legal */}
        <p className="text-center text-slate-400 dark:text-zinc-600 text-xs mt-6 leading-relaxed">
          By continuing, you agree to our{' '}
          <span className="underline cursor-pointer hover:text-slate-600 dark:hover:text-zinc-400 transition-colors">Terms</span>
          {' & '}
          <span className="underline cursor-pointer hover:text-slate-600 dark:hover:text-zinc-400 transition-colors">Privacy Policy</span>.
        </p>

      </div>
      </main>
    </div>
  )
}
