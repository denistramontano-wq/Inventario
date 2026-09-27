import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = (p: P) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...p,
})

export const HomeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </svg>
)
export const CalendarIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    <path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" strokeWidth={2.6} />
  </svg>
)
export const ListIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m4 6 1.5 1.5L8 5M4 12.5 5.5 14 8 11.5M4 19l1.5 1.5L8 18" />
    <path d="M11 6.5h9M11 13h9M11 19.5h9" />
  </svg>
)
export const GearIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
export const PlusIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)
export const BackIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m15 5-7 7 7 7" />
  </svg>
)
export const ChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
)
export const ChevronLeft = BackIcon
export const PencilIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
)
export const UsersIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3a6.5 6.5 0 0 1 3.5 5.7" />
  </svg>
)
export const ClockIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)
export const RepeatIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M17 2.5 20.5 6 17 9.5" />
    <path d="M3.5 11V9.5A3.5 3.5 0 0 1 7 6h13.5M7 21.5 3.5 18 7 14.5" />
    <path d="M20.5 13v1.5A3.5 3.5 0 0 1 17 18H3.5" />
  </svg>
)
export const TrophyIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
  </svg>
)
export const ShareIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
)
export const UndoIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
)
export const FlameIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={24} height={24} {...p}>
    <defs>
      <linearGradient id="flame-g" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#f97316" />
        <stop offset="1" stopColor="#fbbf24" />
      </linearGradient>
    </defs>
    <path
      fill="url(#flame-g)"
      d="M12 2c.5 3.2 2.3 4.9 4 6.6 1.6 1.6 3 3.3 3 6.1A7 7 0 0 1 12 22a7 7 0 0 1-7-7.3c0-2.6 1.3-4.6 3-6 .1 1.9.8 3.2 2.1 3.9C9.6 8.4 10.6 4.9 12 2z"
    />
    <path fill="#fde68a" d="M12 13c1.6 1.4 2.8 2.6 2.8 4.3a2.8 2.8 0 0 1-5.6 0c0-1.5.9-2.6 2.8-4.3z" />
  </svg>
)
