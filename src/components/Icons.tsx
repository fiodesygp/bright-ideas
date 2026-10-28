import type { SVGProps } from 'react'

// Simple line icons. All are decorative (aria-hidden); text labels always sit next to them.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const

type P = SVGProps<SVGSVGElement>

export const HomeIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
)
export const LeafIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 21v-8" /><path d="M12 13c-5 0-8-3-8-8 5 0 8 3 8 8Z" /><path d="M12 15c4 0 7-2.5 7-7-4 0-7 2.5-7 7Z" /></svg>
)
export const BookIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 5a2 2 0 0 1 2-2h6v17H6a2 2 0 0 0-2 2Z" /><path d="M20 5a2 2 0 0 0-2-2h-6v17h6a2 2 0 0 1 2 2Z" /></svg>
)
export const PlugIcon = (p: P) => (
  <svg {...base} {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7Z" /></svg>
)
export const GearIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
)
export const CheckIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></svg>
)
export const AlertIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="10" /><path d="M12 7v6" /><path d="M12 17h.01" /></svg>
)
export const BulbIcon = (p: P) => (
  <svg {...base} {...p}><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></svg>
)
export const FlipIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>
)
export const ArrowLeftIcon = (p: P) => (
  <svg {...base} {...p}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
)
export const ArrowRightIcon = (p: P) => (
  <svg {...base} {...p}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
)
export const TrashIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg>
)
export const CameraIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 7h3l2-3h6l2 3h3v13H4Z" /><circle cx="12" cy="13" r="4" /></svg>
)
export const DownloadIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
)
export const EditIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 20h4L19 9l-4-4L4 16Z" /><path d="m13 7 4 4" /></svg>
)
export const ChartIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 20V4" /><path d="M4 20h16" /><path d="m7 15 4-4 3 3 5-6" /></svg>
)
export const CloseIcon = (p: P) => (
  <svg {...base} {...p}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></svg>
)
export const WarningIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 3 2 20h20Z" /><path d="M12 10v4" /><path d="M12 17h.01" /></svg>
)
