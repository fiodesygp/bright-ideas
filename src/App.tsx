import { HashRouter, Route, Routes } from 'react-router'
import Layout from './components/Layout'
import { SettingsProvider } from './data/settings'
import Home from './pages/Home'
import Log from './pages/Log'
import Dashboard from './pages/Dashboard'
import Learn from './pages/Learn'
import Connect from './pages/Connect'
import CircuitBuilder from './pages/CircuitBuilder'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

// HashRouter keeps refreshes and deep links working on GitHub Pages.
export default function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="log" element={<Log />} />
            <Route path="log/dashboard" element={<Dashboard />} />
            <Route path="learn" element={<Learn />} />
            <Route path="connect" element={<Connect />} />
            <Route path="connect/:circuitId" element={<CircuitBuilder />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </SettingsProvider>
  )
}
