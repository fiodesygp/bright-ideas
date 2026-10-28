import { useEffect, useRef, type ReactNode } from 'react'
import './ConfirmDialog.css'

interface Props {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** Native <dialog>: traps focus, closes on Esc, and returns focus when closed. */
export default function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirm-title" onCancel={onCancel} onClose={onCancel}>
      <h2 id="confirm-title">{title}</h2>
      <div>{children}</div>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onCancel} autoFocus>Cancel</button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  )
}
