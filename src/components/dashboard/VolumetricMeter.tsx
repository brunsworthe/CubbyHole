'use client'

import { formatBytes } from '@/utils/formatters'

// ── Storage quota (free tier) ───────────────────────────────────────────────

const AVG_3D_MB = 15
const AVG_RELIEF_MB = 5
const AVG_2D_MB = 2
const AVG_DOC_MB = 1

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

  // Pie gauge always uses the light-track/darker-fill pairing (not the
  // dark-mode-flipped one above) so it stays legible against the dark header.
  const pieFillClass = isCritical
    ? 'text-red-500'
    : isWarning
      ? 'text-yellow-500'
      : 'text-slate-400'

  const estimates = [
    { label: '3D Objects',       value: remaining3D },
    { label: 'Reliefs',          value: remainingRelief },
    { label: '2D Masterpieces',  value: remaining2D },
    { label: 'Documents',        value: remainingDocs },
  ]

  // Pie-graph gauge + stacked label — replaces the old horizontal bar so the
  // whole indicator stays narrow between the back/brand area and the
  // upgrade-to-pro button at any viewport width.
  const RADIUS = 15.5
  const pointOnCircle = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180
    return { x: 18 + RADIUS * Math.cos(rad), y: 18 + RADIUS * Math.sin(rad) }
  }
  const startAngle = -90
  const endAngle = startAngle + (pct / 100) * 360
  const start = pointOnCircle(startAngle)
  const end = pointOnCircle(endAngle)
  const largeArc = pct > 50 ? 1 : 0
  const pieSlicePath = `M18,18 L${start.x},${start.y} A${RADIUS},${RADIUS} 0 ${largeArc} 1 ${end.x},${end.y} Z`

  return (
    <div className="group relative flex items-center gap-1.5 flex-shrink-0" tabIndex={0}>
      <div className="w-8 h-8 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-8 h-8">
          <circle cx="18" cy="18" r={RADIUS} fill="currentColor" className="text-slate-200" />
          {pct >= 99.9 ? (
            <circle cx="18" cy="18" r={RADIUS} fill="currentColor" className={pieFillClass} />
          ) : pct > 0.1 ? (
            <path d={pieSlicePath} fill="currentColor" className={`transition-all ${pieFillClass}`} />
          ) : null}
        </svg>
      </div>

      <div className={`flex flex-col leading-tight cursor-default outline-none ${textClass}`}>
        <span className="text-[9px] font-semibold whitespace-nowrap">{formatBytes(usedBytes)}</span>
        <span className="text-[9px] whitespace-nowrap">/ {formatBytes(safeLimitBytes)} used</span>
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
