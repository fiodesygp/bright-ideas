import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AnnouncerProvider } from './components/Announcer'
import Layout from './components/Layout'
import { SettingsProvider } from './data/settings'
import Home from './pages/Home'
import Log from './pages/Log'
import Dashboard from './pages/Dashboard'
import Learn, { CONNECT_HASH } from './pages/Learn'
import Settings from './pages/Settings'
import SunDay from './pages/SunDay'
import NotFound from './pages/NotFound'

// HashRouter keeps refreshes and deep links working on any static host, and
// needs no basename: routes live after the #, whatever path the app is served from.
export default function App() {
  return (
    <SettingsProvider>
      <AnnouncerProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="log" element={<Log />} />
              <Route path="log/dashboard" element={<Dashboard />} />
              <Route path="learn" element={<Learn />} />
              <Route path="simulation" element={<SunDay />} />
              {/* Old links: Sun Day was renamed; Connect's circuits now live in Learn, under "How to connect". */}
              <Route path="sun-day" element={<Navigate to="/simulation" replace />} />
              <Route path="connect/*" element={<Navigate to={{ pathname: '/learn', hash: CONNECT_HASH }} replace />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </HashRouter>
      </AnnouncerProvider>
    </SettingsProvider>
  )
}
