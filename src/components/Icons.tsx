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
export const SoilIcon = (p: P) => (
  <svg {...base} {...p}><path d="M10 13V5a2 2 0 0 1 4 0v8" /><path d="M3 20c1.5-3.5 5-5 9-5s7.5 1.5 9 5Z" /><path d="M8 18h.01M16 18h.01M12 18.5h.01" /></svg>
)
export const WaterIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" /><path d="M9 14.5a3 3 0 0 0 2.5 2.5" /></svg>
)
export const UsersIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14a6.5 6.5 0 0 1 3.5 6" /></svg>
)
export const SunIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
)
export const UploadIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" /></svg>
)
export const CloudOffIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 3l18 18" /><path d="M8.5 6.4A6 6 0 0 1 17.7 10H18a4 4 0 0 1 2.4 7.2" /><path d="M17 19H7a5 5 0 0 1-1.6-9.7" /></svg>
)
