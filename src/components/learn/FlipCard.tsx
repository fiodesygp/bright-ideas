import { useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { FlipIcon } from '../Icons'

interface Props {
  title: string
  front: ReactNode
  back: ReactNode
  /** Visible text on the button that flips to the back */
  flipLabel?: string
}

/**
 * A two-sided card. Only the visible side can be reached by keyboard or screen
 * reader (the hidden side is inert). After flipping, focus moves to the new side.
 */
export default function FlipCard({ title, front, back, flipLabel = 'Flip card' }: Props) {
  const [flipped, setFlipped] = useState(false)
  const frontRef = useRef<HTMLHeadingElement>(null)
  const backRef = useRef<HTMLHeadingElement>(null)

  function flip() {
    const next = !flipped
    setFlipped(next)
    // Wait for inert to lift before moving focus.
    requestAnimationFrame(() => (next ? backRef : frontRef).current?.focus())
  }

  // Tapping the card face also flips it; the button is the keyboard path.
  const onFaceClick = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('button, a, input, label, summary')) flip()
  }

  return (
    <div className={`flip-card${flipped ? ' is-flipped' : ''}`}>
      <div className="flip-inner">
        <div className="flip-face flip-front" inert={flipped} onClick={onFaceClick}>
          <h3 ref={frontRef} tabIndex={-1}>{title}</h3>
          {front}
          <button type="button" className="btn btn-secondary flip-btn" onClick={flip}>
            <FlipIcon width={20} height={20} /> {flipLabel}
            <span className="visually-hidden">: {title}</span>
          </button>
        </div>
        <div className="flip-face flip-back" inert={!flipped} onClick={onFaceClick}>
          <h3 ref={backRef} tabIndex={-1}>{title}<span className="flip-side"> (back)</span></h3>
          {back}
          <button type="button" className="btn btn-secondary flip-btn" onClick={flip}>
            <FlipIcon width={20} height={20} /> Flip back
            <span className="visually-hidden">: {title}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
