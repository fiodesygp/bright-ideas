import type { ReactNode } from 'react'

/** Page title. Focusable so Layout can move focus here after navigation. */
export default function PageHeading({ children }: { children: ReactNode }) {
  return <h1 tabIndex={-1}>{children}</h1>
}
