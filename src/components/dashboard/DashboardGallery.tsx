'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Box, Link2, Scan, Share2 } from 'lucide-react'
import ProfileSelector from './ProfileSelector'
import CapsuleCard from './CapsuleCard'
import CapsuleDashboard from './CapsuleDashboard'
import ShareSettingsModal from '@/components/modals/ShareSettingsModal'
import LinkHouseholdPanel from '@/components/panels/LinkHouseholdPanel'
import CaptureFlow from '@/components/capture/CaptureFlow'
import ThemeToggle from '@/components/ui/ThemeToggle'
import type { Capsule, HouseholdLink, VisibilityTier } from '@/types/dashboard'

const TimeCapsuleViewer = dynamic(
  () => import('@/components/3d/TimeCapsuleViewer'),
  { ssr: false }
)

// ── Mock data ─────────────────────────────────────────────────────────────────
// accentFrom/Via carry both light and dark Tailwind classes as a single string
// so Tailwind's scanner picks them up and generates both variants.

const INITIAL_OWN_CAPSULES: Capsule[] = [
  {
    id: 'c1', title: 'First Footsteps', childName: 'Emma', capturedAt: 'Mar 2021',
    modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
    accentFrom: 'from-amber-100/80 dark:from-amber-900/60',
    accentVia:  'via-orange-50/40 dark:via-orange-950/30',
    visibilityTier: 'private', customGrants: [],
  },
  {
    id: 'c2', title: 'Birthday Flamingo', childName: 'Emma', capturedAt: 'Jun 2022',
    modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Flamingo.glb',
    accentFrom: 'from-rose-100/80 dark:from-rose-900/60',
    accentVia:  'via-pink-50/40 dark:via-pink-950/30',
    visibilityTier: 'linked', customGrants: [],
  },
  {
    id: 'c3', title: 'Toy Soldier', childName: 'Liam', capturedAt: 'Jan 2023',
    modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb',
    accentFrom: 'from-blue-100/80 dark:from-blue-900/60',
    accentVia:  'via-indigo-50/40 dark:via-indigo-950/30',
    visibilityTier: 'custom', customGrants: ['f1'],
  },
  {
    id: 'c4', title: 'Rocking Horse', childName: 'Liam', capturedAt: 'Aug 2023',
    modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Horse.glb',
    accentFrom: 'from-emerald-100/80 dark:from-emerald-900/60',
    accentVia:  'via-teal-50/40 dark:via-teal-950/30',
    visibilityTier: 'custom', customGrants: ['f1', 'f2'],
  },
  {
    id: 'c5', title: 'First Drawing', childName: 'Emma', capturedAt: 'Nov 2023',
    modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
    accentFrom: 'from-violet-100/80 dark:from-violet-900/60',
    accentVia:  'via-purple-50/40 dark:via-purple-950/30',
    visibilityTier: 'private', customGrants: [],
  },
  {
    id: 'c6', title: 'Christmas Ornament', childName: 'Liam', capturedAt: 'Dec 2023',
    modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Flamingo.glb',
    accentFrom: 'from-red-100/80 dark:from-red-900/60',
    accentVia:  'via-rose-50/40 dark:via-rose-950/30',
    visibilityTier: 'linked', customGrants: [],
  },
]

const INITIAL_LINKED_FAMILIES: HouseholdLink[] = [
  { id: 'f1', familyName: 'The Martins',  email: 'martins@family.com',          status: 'active',  initials: 'TM', colorClass: 'bg-sky-600' },
  { id: 'f2', familyName: 'Grandma Ruth', email: 'ruth.henderson@email.com',    status: 'active',  initials: 'GR', colorClass: 'bg-purple-600' },
  { id: 'f3', familyName: 'The Garcias',  email: 'garcia.family@email.com',     status: 'pending', initials: 'TG', colorClass: 'bg-emerald-700' },
]

const LINKED_FAMILY_CAPSULES: Record<string, Capsule[]> = {
  f1: [
    {
      id: 'lf1-1', title: "Max's Soccer Trophy", childName: 'Max', capturedAt: 'Sep 2023',
      modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb',
      accentFrom: 'from-sky-100/80 dark:from-sky-900/60',
      accentVia:  'via-blue-50/40 dark:via-blue-950/30',
      visibilityTier: 'linked', customGrants: [],
    },
    {
      id: 'lf1-2', title: "Sophie's Art Project", childName: 'Sophie', capturedAt: 'Oct 2023',
      modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
      accentFrom: 'from-cyan-100/80 dark:from-cyan-900/60',
      accentVia:  'via-teal-50/40 dark:via-teal-950/30',
      visibilityTier: 'custom', customGrants: [],
    },
  ],
  f2: [
    {
      id: 'lf2-1', title: 'Vintage Dollhouse', childName: 'Family Heirloom', capturedAt: 'Jan 2024',
      modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Horse.glb',
      accentFrom: 'from-purple-100/80 dark:from-purple-900/60',
      accentVia:  'via-violet-50/40 dark:via-violet-950/30',
      visibilityTier: 'linked', customGrants: [],
    },
  ],
}

// ── Tier summary pills ────────────────────────────────────────────────────────

const TIER_PILL: Record<VisibilityTier, { label: string; classes: string }> = {
  private: {
    label: 'private',
    classes: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
  },
  linked: {
    label: 'shared',
    classes: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/60',
  },
  custom: {
    label: 'custom',
    classes: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  },
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardGallery() {
  const [capsules, setCapsules] = useState<Capsule[]>(INITIAL_OWN_CAPSULES)
  const [linkedFamilies, setLinkedFamilies] = useState<HouseholdLink[]>(INITIAL_LINKED_FAMILIES)
  const [activeProfile, setActiveProfile] = useState<string>('own')
  const [activeCapsule, setActiveCapsule] = useState<Capsule | null>(null)
  const [shareTarget, setShareTarget] = useState<Capsule | null>(null)
  const [showLinkPanel, setShowLinkPanel] = useState(false)
  const [showScanFlow, setShowScanFlow] = useState(false)

  const isAnyOverlayOpen = !!activeCapsule || !!shareTarget || showLinkPanel || showScanFlow
  useEffect(() => {
    document.body.style.overflow = isAnyOverlayOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isAnyOverlayOpen])

  const handleOpenViewer  = useCallback((c: Capsule) => setActiveCapsule(c), [])
  const handleCloseViewer = useCallback(() => setActiveCapsule(null), [])
  const handleOpenShare   = useCallback((c: Capsule) => setShareTarget(c), [])
  const handleCloseShare  = useCallback(() => setShareTarget(null), [])
  const handlePreload     = useCallback((c: Capsule) => { (TimeCapsuleViewer as any).preload?.(c.modelUrl) }, [])

  const handleSaveShareSettings = useCallback(
    (capsuleId: string, tier: VisibilityTier, grants: string[]) => {
      setCapsules((prev) =>
        prev.map((c) => c.id === capsuleId ? { ...c, visibilityTier: tier, customGrants: grants } : c)
      )
    }, []
  )

  const handleAddFromScan = useCallback(() => {
    const now = new Date()
    const label = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const newCapsule: Capsule = {
      id: `scan-${Date.now()}`,
      title: 'New 3D Scan',
      childName: 'Emma',
      capturedAt: label,
      modelUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
      accentFrom: 'from-teal-100/80 dark:from-teal-900/60',
      accentVia:  'via-cyan-50/40 dark:via-cyan-950/30',
      visibilityTier: 'private',
      customGrants: [],
    }
    setCapsules((prev) => [newCapsule, ...prev])
    setShowScanFlow(false)
    setActiveProfile('own')
  }, [])

  const handleAddConnection = useCallback((familyName: string, email: string) => {
    const initials = familyName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    setLinkedFamilies((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, familyName, email, status: 'pending', initials, colorClass: 'bg-zinc-500' },
    ])
  }, [])

  const isOwnProfile     = activeProfile === 'own'
  const displayedCapsules = isOwnProfile ? capsules : (LINKED_FAMILY_CAPSULES[activeProfile] ?? [])
  const activeFamily      = linkedFamilies.find((f) => f.id === activeProfile)

  const tierCounts = isOwnProfile
    ? capsules.reduce(
        (acc, c) => { acc[c.visibilityTier]++; return acc },
        { private: 0, linked: 0, custom: 0 } as Record<VisibilityTier, number>
      )
    : null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-200">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-900 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/25 dark:border-amber-400/25 flex items-center justify-center">
              <Box className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-zinc-100">CubbyHole</span>
          </div>

          {/* Profile selector */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <ProfileSelector
              activeProfileId={activeProfile}
              linkedFamilies={linkedFamilies}
              onSelect={setActiveProfile}
              onOpenLinkPanel={() => setShowLinkPanel(true)}
            />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowLinkPanel(true)}
              className="
                hidden sm:flex items-center gap-1.5 text-xs font-medium
                px-2.5 py-1.5 rounded-lg border transition-all
                bg-slate-100 dark:bg-zinc-900
                border-slate-200 dark:border-zinc-800
                hover:bg-slate-200 dark:hover:bg-zinc-800
                hover:border-slate-300 dark:hover:border-zinc-700
                text-slate-500 dark:text-zinc-400
                hover:text-slate-800 dark:hover:text-zinc-200
              "
              title="Manage linked households"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Manage</span>
            </button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Avatar */}
            <div className="
              w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
              bg-slate-200 dark:bg-zinc-800
              border border-slate-300 dark:border-zinc-700
              text-slate-600 dark:text-zinc-400
            ">
              H
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Captures from device camera (IndexedDB) ── */}
        <CapsuleDashboard onOpenCapture={() => setShowScanFlow(true)} />

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800" />
          <span className="text-xs font-medium text-slate-400 dark:text-zinc-600 tracking-widest uppercase">
            Time Capsule Library
          </span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800" />
        </div>

        {/* Section header */}
        <div className="mb-6">
          {isOwnProfile ? (
            <>
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                    My Time Capsules
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">
                    {capsules.length} artifacts preserved
                  </p>
                </div>
                <button
                  onClick={() => setShowScanFlow(true)}
                  className="
                    flex items-center gap-2 text-xs font-semibold
                    px-3.5 py-2 rounded-xl border transition-all
                    bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                    border-amber-500 hover:border-amber-400
                    text-white
                  "
                >
                  <Scan className="w-3.5 h-3.5" />
                  Scan Object
                </button>
              </div>

              {/* Tier summary pills */}
              {tierCounts && (
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {(Object.entries(tierCounts) as [VisibilityTier, number][])
                    .filter(([, n]) => n > 0)
                    .map(([t, n]) => (
                      <span
                        key={t}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${TIER_PILL[t].classes}`}
                      >
                        {n} {TIER_PILL[t].label}
                      </span>
                    ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${activeFamily?.colorClass ?? 'bg-slate-300 dark:bg-zinc-700'} flex items-center justify-center text-white font-bold text-sm`}>
                {activeFamily?.initials ?? '?'}
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                  {activeFamily?.familyName ?? 'Linked Family'}
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">
                  {displayedCapsules.length} artifact{displayedCapsules.length !== 1 ? 's' : ''} shared with you
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Gallery grid */}
        {displayedCapsules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedCapsules.map((capsule) => (
              <CapsuleCard
                key={capsule.id}
                capsule={capsule}
                isOwnProfile={isOwnProfile}
                onView={handleOpenViewer}
                onShare={handleOpenShare}
                onHover={handlePreload}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-600 mb-4">
              <Box className="w-7 h-7" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">Nothing shared yet</p>
            <p className="text-xs text-slate-400 dark:text-zinc-600 mt-1">
              {activeFamily?.familyName} hasn't shared any capsules with you.
            </p>
          </div>
        )}
      </main>

      {/* ── 3D Viewer Modal ── */}
      {activeCapsule && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-zinc-950/97 backdrop-blur-xl animate-fade-in"
          role="dialog" aria-modal="true" aria-labelledby="viewer-title"
        >
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
            <div>
              <h2 id="viewer-title" className="font-semibold text-zinc-100 text-sm">{activeCapsule.title}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{activeCapsule.childName} · {activeCapsule.capturedAt}</p>
            </div>
            <div className="flex items-center gap-2">
              {isOwnProfile && (
                <button
                  onClick={() => { handleCloseViewer(); handleOpenShare(activeCapsule) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              )}
              <button
                onClick={handleCloseViewer}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <TimeCapsuleViewer modelUrl={activeCapsule.modelUrl} />
          </div>
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-t border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
            <span className="text-xs text-zinc-600">Drag · Pinch · Scroll to explore</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-zinc-600">Interactive 3D</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Share Settings Modal ── */}
      {shareTarget && (
        <ShareSettingsModal
          capsule={shareTarget}
          linkedFamilies={linkedFamilies}
          onClose={handleCloseShare}
          onSave={handleSaveShareSettings}
        />
      )}

      {/* ── Link Household Panel ── */}
      {showLinkPanel && (
        <LinkHouseholdPanel
          connections={linkedFamilies}
          onAddConnection={handleAddConnection}
          onClose={() => setShowLinkPanel(false)}
        />
      )}

      {/* ── 3D Capture Flow ── */}
      {showScanFlow && (
        <CaptureFlow
          onClose={() => setShowScanFlow(false)}
          onAddToCapsule={handleAddFromScan}
        />
      )}
    </div>
  )
}
