import './Waves.css'

interface Props {
  /** hero: Home banner. header: page title accent. empty: empty-state accent. */
  variant: 'hero' | 'header' | 'empty'
}

/**
 * Soft organic wave shapes from the Bright Ideas title slide: lime in the top
 * right, teal in the bottom left. Pure decoration. Layouts keep text out of
 * the corners these occupy.
 */
export default function Waves({ variant }: Props) {
  return (
    <div className={`waves waves-${variant}`} aria-hidden="true">
      <svg className="wave wave-lime" viewBox="0 0 600 300" preserveAspectRatio="none" focusable="false">
        <path d="M0 0 C40 92 130 128 270 130 C400 132 500 160 600 300 L600 0 Z" />
      </svg>
      {variant !== 'header' && (
        <svg className="wave wave-teal" viewBox="0 0 600 300" preserveAspectRatio="none" focusable="false">
          <path d="M0 0 C70 90 150 156 320 162 C450 166 520 200 580 300 L0 300 Z" />
        </svg>
      )}
    </div>
  )
}
