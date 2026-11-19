import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { BookIcon, GearIcon, HomeIcon, LeafIcon, SunIcon } from './Icons'

const TABS = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/log', label: 'Log', Icon: LeafIcon, end: false },
  { to: '/learn', label: 'Learn', Icon: BookIcon, end: false },
  { to: '/simulation', label: 'Simulation', Icon: SunIcon, end: false },
  { to: '/settings', label: 'Settings', Icon: GearIcon, end: false },
]

export default function Layout() {
  const { pathname, hash } = useLocation()
  const lastPath = useRef(pathname)

  // On navigation, start at the top and move focus to the new page heading
  // so screen reader and keyboard users know the page changed. A link to a
  // section (e.g. #/learn#how-to-connect) is left to the page, which moves there.
  useEffect(() => {
    // Not on the first visit, and not when only the section changes.
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    if (hash) return
    window.scrollTo(0, 0)
    document.querySelector<HTMLElement>('main h1')?.focus()
  }, [pathname, hash])

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => {
        // Hash routing owns the URL hash, so move focus by hand.
        e.preventDefault()
        document.getElementById('main')?.focus()
      }}>
        Skip to main content
      </a>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Main">
        <ul>
          {TABS.map(({ to, label, Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end}>
                <Icon />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
