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
    'w-full bg-zinc-900 border border-zinc-700 focus:border-amber-500/70 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 text-sm outline-none transition-colors'

  const labelClass =
    'block text-zinc-400 text-xs font-medium mb-1.5 tracking-wider uppercase'

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">

      {/* Ambient amber glow — matches the rest of the app */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(251,191,36,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">

        {/* ── Wordmark ──────────────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 rounded-2xl ring-1 ring-amber-500/20 mb-4">
            <svg
              className="w-7 h-7 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight">CubbyHole</h1>
          <p className="text-zinc-500 text-sm mt-1">Your family&apos;s 3D memory vault</p>
        </div>

        {/* ── Card ──────────────────────────────────────────────────────────── */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">

          {/* Magic link sent confirmation */}
          {magicLinkSent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 rounded-2xl ring-1 ring-amber-500/20 mb-5">
                <Inbox className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-white font-semibold text-lg mb-2">Check your inbox</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                We sent a sign-in link to your email address. Tap it from any device to open
                your vault — no password needed.
              </p>
              <button
                onClick={switchMode}
                className="text-amber-400 hover:text-amber-300 text-sm transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Heading */}
              <h2 className="text-white font-semibold text-lg mb-1">
                {isMagicLinkMode ? 'Send a magic link' : 'Welcome back'}
              </h2>
              <p className="text-zinc-500 text-sm mb-6">
                {isMagicLinkMode
                  ? "We'll email you a one-tap link — no password needed."
                  : 'Sign in to your parent account.'}
              </p>

              <div className="space-y-4">

                {/* Email field */}
                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
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
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
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
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
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
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                        : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
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
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm shadow-amber-500/20"
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
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm shadow-amber-500/20"
                    >
                      {loading
                        ? <><Loader2    className="w-4 h-4 animate-spin" /> Signing in…</>
                        : <><ArrowRight className="w-4 h-4" />             Sign In</>}
                    </button>

                    {/* Create Account */}
                    <button
                      onClick={handleSignUp}
                      disabled={loading}
                      className="w-full flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-200 font-medium py-3.5 rounded-xl transition-colors border border-zinc-700"
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
              <div className="mt-6 pt-5 border-t border-zinc-800 text-center">
                <button
                  onClick={switchMode}
                  disabled={loading}
                  className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors disabled:opacity-40"
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
        <p className="text-center text-zinc-600 text-xs mt-6 leading-relaxed">
          By continuing, you agree to our{' '}
          <span className="underline cursor-pointer hover:text-zinc-400 transition-colors">Terms</span>
          {' & '}
          <span className="underline cursor-pointer hover:text-zinc-400 transition-colors">Privacy Policy</span>.
        </p>

      </div>
    </div>
  )
}
