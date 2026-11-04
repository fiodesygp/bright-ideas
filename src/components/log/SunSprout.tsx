/**
 * Small sun-and-sprout drawing for the Log form header. Flat shapes in the
 * brand wave colours, like the title slide. Pure decoration.
 */
export default function SunSprout() {
  return (
    <svg className="sun-sprout" viewBox="0 0 96 80" aria-hidden="true" focusable="false">
      <g className="sun-rays" stroke="var(--lime-border)" strokeWidth="3" strokeLinecap="round">
        <path d="M68 4v6M68 42v6M46 26h6M84 26h6M52.4 10.4l4.2 4.2M79.4 37.4l4.2 4.2M52.4 41.6l4.2-4.2M79.4 14.6l4.2-4.2" />
      </g>
      <circle cx="68" cy="26" r="12" fill="var(--wave-lime)" stroke="var(--lime-border)" strokeWidth="2" />
      <path d="M6 76c4-12 16-16 30-16s26 4 30 16Z" fill="var(--wave-teal)" />
      <path d="M36 62V40" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M36 46c-12 1-19-5-20-16 11-1 19 5 20 16Z" fill="var(--brand-green)" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M36 42c1-11 8-17 19-17 0 11-8 17-19 17Z" fill="var(--brand-green)" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
