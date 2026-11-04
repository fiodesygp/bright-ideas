import { useEffect, useId, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAnnounce } from '../Announcer'
import ConfirmDialog from '../ConfirmDialog'
import { CheckIcon, EditIcon, UsersIcon } from '../Icons'
import { logContent } from '../../content'
import { db, deleteLearner, type Learner } from '../../data/db'
import { useSettings } from '../../data/settings'
import { useLearners } from '../../data/useLearners'
import { fill, learnerDetails, logTitle } from '../../lib/labels'
import AboutForm from './AboutForm'
import './Learner.css'

const { about, announce: say } = logContent

type Panel = 'none' | 'edit' | 'switch' | 'add'

/**
 * Top of the Log and Dashboard: "Maya's Planting Log · Basil · started Nov 4",
 * with Edit and a "Who's logging?" switcher for shared devices. With nobody
 * set up yet, it shows the "About my log" card instead.
 */
export default function LearnerBar() {
  const { learners, current, switchTo } = useLearners()
  const { update } = useSettings()
  const announce = useAnnounce()
  const [panel, setPanel] = useState<Panel>('none')
  const [notice, setNotice] = useState('')
  const [deleting, setDeleting] = useState<Learner | null>(null)
  // After the last learner is deleted, focus the "About my log" card that replaces the bar.
  const [focusStart, setFocusStart] = useState(false)
  const id = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const editBtnRef = useRef<HTMLButtonElement>(null)
  const switchBtnRef = useRef<HTMLButtonElement>(null)
  // Where focus goes once the next render has the right controls on screen.
  const focusNext = useRef<'title' | 'edit' | 'switch' | null>(null)
  const deleteCount = useLiveQuery(
    () => (deleting ? db.entries.filter((e) => e.learnerId === deleting.id).count() : 0),
    [deleting],
  )

  useEffect(() => {
    const target = focusNext.current
    if (!target) return
    const el = { title: titleRef, edit: editBtnRef, switch: switchBtnRef }[target].current
    // The learner list loads a moment after a change; try again on the next render.
    if (!el) return
    focusNext.current = null
    el.focus()
  })

  if (!learners) return null

  const open = (next: Panel) => {
    setNotice('')
    setPanel(next)
  }
  const close = (focus: 'title' | 'edit' | 'switch') => {
    focusNext.current = focus
    setPanel('none')
  }

  function onCreated({ id: newId, name }: Learner, adopted: number) {
    switchTo(newId)
    setFocusStart(false)
    const message = adopted ? fill(say.adopted, { name }) : fill(say.ready, { name })
    setNotice(adopted ? message : '')
    announce(message)
    close('title')
  }

  if (!current) {
    return (
      <AboutForm
        mode="start"
        onSaved={onCreated}
        focusOnOpen={focusStart}
      />
    )
  }

  const switchId = `${id}-switch`
  const titleId = `${id}-title`
  const details = learnerDetails(current)

  return (
    <section className="learner-bar card" aria-labelledby={titleId}>
      <h2 id={titleId} ref={titleRef} tabIndex={-1}>{logTitle(current)}</h2>
      {details && <p className="learner-details">{details}</p>}
      {notice && (
        <div className="callout callout-success learner-notice">
          <CheckIcon />
          <p>{notice}</p>
        </div>
      )}

      {panel !== 'edit' && (
        <div className="learner-actions">
          <button type="button" className="btn btn-secondary" ref={editBtnRef} onClick={() => open('edit')}>
            <EditIcon width={20} height={20} /> {about.edit}<span className="visually-hidden"> {logTitle(current)}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            ref={switchBtnRef}
            aria-expanded={panel === 'switch' || panel === 'add'}
            aria-controls={switchId}
            onClick={() => (panel === 'none' ? open('switch') : close('switch'))}
          >
            <UsersIcon width={20} height={20} /> {about.switcher}
          </button>
        </div>
      )}

      {panel === 'edit' && (
        <AboutForm
          mode="edit"
          learner={current}
          focusOnOpen
          onSaved={() => {
            announce(say.changesSaved)
            close('edit')
          }}
          onCancel={() => close('edit')}
          onDelete={() => setDeleting(current)}
        />
      )}

      <div id={switchId} hidden={panel !== 'switch' && panel !== 'add'} className="learner-panel">
        {panel === 'switch' && (
          <>
            <h3>{about.switcher}</h3>
            <p className="field-help">{about.switcherHelp}</p>
            <ul className="learner-list">
              {learners.map((l) => {
                const isCurrent = l.id === current.id
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      className={`btn btn-secondary btn-block learner-pick${isCurrent ? ' is-current' : ''}`}
                      aria-current={isCurrent || undefined}
                      onClick={() => {
                        if (!isCurrent) {
                          switchTo(l.id)
                          announce(fill(say.switched, { name: l.name }))
                        }
                        close('title')
                      }}
                    >
                      {isCurrent && <CheckIcon width={20} height={20} />}
                      {l.name}
                      {isCurrent && <span className="learner-current"> {about.current}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
            <button type="button" className="btn btn-ghost learner-add" onClick={() => open('add')}>
              + {about.addSomeone}
            </button>
          </>
        )}
        {panel === 'add' && (
          <AboutForm
            mode="add"
            focusOnOpen
            onSaved={onCreated}
            onCancel={() => close('switch')}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title={deleting ? fill(about.deleteTitle, { name: deleting.name }) : ''}
        confirmLabel="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          const { name } = deleting
          const wasLast = learners.length === 1
          await deleteLearner(deleting.id)
          setFocusStart(wasLast)
          update({ learnerId: undefined })
          setDeleting(null)
          setPanel('none')
          announce(fill(say.learnerDeleted, { name }))
          focusNext.current = 'title'
        }}
      >
        <p>{deleting && fill(about.deleteText, { name: deleting.name, count: entriesText(deleteCount ?? 0) })}</p>
        <p>{about.deleteTip}</p>
      </ConfirmDialog>
    </section>
  )
}

function entriesText(n: number) {
  return `${n} ${n === 1 ? 'entry' : 'entries'}`
}
