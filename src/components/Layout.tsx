import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { BookIcon, GearIcon, HomeIcon, LeafIcon, PlugIcon } from './Icons'

const TABS = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/log', label: 'Log', Icon: LeafIcon, end: false },
  { to: '/learn', label: 'Learn', Icon: BookIcon, end: false },
  { to: '/connect', label: 'Connect', Icon: PlugIcon, end: false },
  { to: '/settings', label: 'Settings', Icon: GearIcon, end: false },
]

export default function Layout() {
  const { pathname } = useLocation()
  const firstRender = useRef(true)

  // On navigation, start at the top and move focus to the new page heading
  // so screen reader and keyboard users know the page changed.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo(0, 0)
    document.querySelector<HTMLElement>('main h1')?.focus()
  }, [pathname])

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
