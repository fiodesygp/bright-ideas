import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Announce = (message: string) => void

const AnnouncerContext = createContext<Announce>(() => {})

/**
 * One polite live region for the whole app. It lives above the pages, so a
 * message still gets read when the part that sent it closes (like an edit form
 * that closes on save).
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Clear first so the same message (e.g. "Photo added" twice) is read again.
  const announce = useCallback<Announce>((msg) => {
    setMessage('')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(msg), 100)
  }, [])

  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <p id="announcer" className="visually-hidden" role="status">{message}</p>
    </AnnouncerContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useAnnounce() {
  return useContext(AnnouncerContext)
}
