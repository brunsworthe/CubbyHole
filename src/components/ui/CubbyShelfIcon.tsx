import { useId } from 'react'

interface Props {
  color: string
  className?: string
}

// A single shelf compartment from the CubbyHole brand icon — same proportions
// (one 6×9 box inset 2 units inside its wood frame) and same nested-rect
// rectangular fade, recoloured to a capsule's own theme colour. Used wherever
// a card needs to represent "one cubby" rather than a generic folder.
export default function CubbyShelfIcon({ color, className }: Props) {
  const grainId = useId()

  return (
    <svg viewBox="0 0 8.667 11.667" className={className} aria-hidden="true">
      <defs>
        <pattern id={grainId} width="2.2" height="11.667" patternUnits="userSpaceOnUse">
          <rect width="2.2" height="11.667" fill="#8b5e3c" />
          <path d="M0.3 0 Q1.1 2 0.5 4 Q0 6 0.9 8 Q1.4 10 0.6 11.667" stroke="#6b4226" strokeWidth="0.18" fill="none" opacity="0.55" />
          <path d="M1.6 0 Q0.9 2.5 1.7 5 Q2.2 7.2 1.3 9.2 Q0.8 10.8 1.6 11.667" stroke="#a87b52" strokeWidth="0.14" fill="none" opacity="0.4" />
        </pattern>
      </defs>
      <rect x="0"     y="0"     width="8.667" height="11.667" rx="1" fill={`url(#${grainId})`} />
      <rect x="1.333" y="1.333" width="6"   height="9"   fill={color} />
      <rect x="1.933" y="2.233" width="4.8" height="7.2" fill="white" fillOpacity="0.4" />
      <rect x="2.833" y="3.583" width="3"   height="4.5" fill="white" fillOpacity="0.85" />
    </svg>
  )
}
