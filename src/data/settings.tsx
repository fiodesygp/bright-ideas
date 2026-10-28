import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { HeightUnit } from './db'

export interface Settings {
  plantName: string
  heightUnit: HeightUnit
}

const KEY = 'bright-ideas:settings'
const DEFAULTS: Settings = { plantName: 'My plant', heightUnit: 'cm' }

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  reset: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(load)

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // Storage can be blocked (private mode); settings still work for this visit.
      }
      return next
    })
  }, [])

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
    setSettings(DEFAULTS)
  }, [])

  return <SettingsContext value={{ settings, update, reset }}>{children}</SettingsContext>
}

// oxlint-disable-next-line react/only-export-components
export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
