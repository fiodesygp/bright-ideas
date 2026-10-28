import type { ReactNode } from 'react'
import Waves from './Waves'

/** Page title. Focusable so Layout can move focus here after navigation. */
export default function PageHeading({ children }: { children: ReactNode }) {
  return <h1 tabIndex={-1}>{children}</h1>
}

/** Page title with the small lime wave accent above it. */
export function PageHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-header">
      <Waves variant="header" />
      <div className="page-header-text">
        <PageHeading>{title}</PageHeading>
        {children}
      </div>
    </header>
  )
}
