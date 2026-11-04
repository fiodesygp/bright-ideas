import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { useSettings } from './settings'

/**
 * Everyone logging on this device, and who is logging now. `learners` is
 * undefined while the list loads. If the saved learner is gone, the first
 * learner is used.
 */
export function useLearners() {
  const { settings, update } = useSettings()
  const learners = useLiveQuery(() => db.learners.orderBy('id').toArray(), [])
  const current = learners?.find((l) => l.id === settings.learnerId) ?? learners?.[0]
  const switchTo = useCallback((learnerId: number) => update({ learnerId }), [update])
  return { learners, current, switchTo }
}
