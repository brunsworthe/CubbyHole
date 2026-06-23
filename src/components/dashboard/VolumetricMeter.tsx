'use client'

// ── Storage quota (free tier) ───────────────────────────────────────────────

const AVG_3D_MB = 15
const AVG_RELIEF_MB = 5
const AVG_2D_MB = 2
const AVG_DOC_MB = 1

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  if (mb < 1000) {
    return `${Math.round(mb)} MB`
  }
  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}

export default function VolumetricMeter({ usedBytes, limitBytes }: { usedBytes: number; limitBytes: number | null }) {
  // Dynamic, profile-driven limit (granted via an access code) — falls back to 0
  // so the math degrades to "no space" rather than NaN while the profile loads.
  const safeLimitBytes = limitBytes || 0
  const remainingBytes = Math.max(0, safeLimitBytes - usedBytes)
  const remainingMB = remainingBytes / (1024 * 1024)

  const remaining3D     = Math.floor(remainingMB / AVG_3D_MB)
  const remainingRelief = Math.floor(remainingMB / AVG_RELIEF_MB)
  const remaining2D     = Math.floor(remainingMB / AVG_2D_MB)
  const remainingDocs   = Math.floor(remainingMB / AVG_DOC_MB)

  const pct = safeLimitBytes > 0 ? Math.min(100, (usedBytes / safeLimitBytes) * 100) : 100
  const isCritical = pct >= 100
  const isWarning  = pct >= 80

  const textClass = isCritical
    ? 'text-red-500 dark:text-red-400'
    : isWarning
      ? 'text-yellow-500 dark:text-yellow-400'
      : 'text-slate-500 dark:text-zinc-500'
  const barClass = isCritical
    ? 'bg-red-500'
    : isWarning
      ? 'bg-yellow-500'
      : 'bg-slate-400 dark:bg-zinc-500'

  const estimates = [
    { label: '3D Objects',       value: remaining3D },
    { label: 'Reliefs',          value: remainingRelief },
    { label: '2D Masterpieces',  value: remaining2D },
    { label: 'Documents',        value: remainingDocs },
  ]

  return (
    <div className="hidden md:block group relative mr-2" tabIndex={0}>
      <div className="flex flex-col gap-1 w-36 cursor-default outline-none">
        <span className={`text-[11px] font-medium leading-none ${textClass}`}>
          {formatBytes(usedBytes)} / {formatBytes(safeLimitBytes)} Used
        </span>
        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Tooltip — progressive disclosure of the per-mode estimates */}
      <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 absolute top-full mt-2 right-0 bg-black/90 text-white p-3 rounded-md shadow-lg border border-white/10 z-[100] transition-all w-64">
        <p className="text-[11px] font-semibold text-white/90 mb-2">Available Space Estimates:</p>
        <ul className="space-y-1">
          {estimates.map(({ label, value }) => (
            <li key={label} className="flex items-center justify-between text-[11px] text-white/70">
              <span>{label}</span>
              <span className="font-semibold text-white">{value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
