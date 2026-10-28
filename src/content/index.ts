// Typed access to the editable content files in this folder.
// Edit the .json files to change any text; no code changes needed.
import homeJson from './home.json'
import logJson from './log.json'
import componentsJson from './components.json'
import circuitsJson from './circuits.json'

export interface HomeContent {
  appName: string
  tagline: string
  subtitle: string
  drivingQuestionLabel: string
  drivingQuestion: string
  sections: { to: string; title: string; text: string }[]
}

export interface LogContent {
  intro: string
  fields: Record<'date' | 'height' | 'heightHelp' | 'note' | 'noteHelp' | 'photo' | 'photoHelp', string>
  dashboardIntro: string
  emptyTitle: string
  emptyText: string
}

export type PartType = 'panel' | 'led' | 'resistor' | 'motor' | 'pump' | 'water' | 'clip'

export interface QuickCheck {
  question: string
  options: { id: string; text: string }[]
  answer: string
  hint: string
  explain: string
}

export interface ComponentCard {
  id: string
  name: string
  partType: PartType
  /** Path under public/, e.g. "photos/led.jpg". Null shows the drawn placeholder. */
  photo: string | null
  imageAlt: string
  whatItDoes: string
  polarity: string
  howToConnect: string
  watchOut: string
  quickCheck: QuickCheck
}

export interface ConceptCard {
  id: string
  title: string
  teaser: string
  body: string
  example: string
}

export interface ComponentsContent {
  intro: string
  components: ComponentCard[]
  conceptsIntro: string
  concepts: ConceptCard[]
}

export interface DiagramPart {
  id: string
  type: PartType
  x: number
  y: number
  label: string
  /** Degrees, multiples of 90. Use -90 to lay a resistor flat with end "a" on the left. */
  rotate?: number
  /** Move the part's label if it bumps into something */
  labelSide?: 'above' | 'below' | 'left' | 'right'
}

export interface DiagramWire {
  id: string
  /** "partId.terminal", e.g. "panel.pos" or "led.anode" */
  from: string
  to: string
  side: '+' | '-'
  via?: [number, number][]
}

export interface CircuitStep {
  text: string
  /** "safety" shows the step as a warning */
  kind?: 'safety'
  wire?: string
  highlightParts?: string[]
  /** Optional override for the auto-generated diagram description. */
  alt?: string
}

export interface Circuit {
  id: string
  number: number
  title: string
  summary: string
  status: 'ready' | 'coming-soon'
  parts: string[]
  diagram?: {
    height: number
    /** Visible area left edge and width (defaults 30 and 300) */
    viewX?: number
    viewWidth?: number
    parts: DiagramPart[]
    wires: DiagramWire[]
  }
  steps?: CircuitStep[]
  success?: string
  troubleshooting?: string[]
}

export interface CircuitsContent {
  intro: string
  circuits: Circuit[]
}

export const home = homeJson as HomeContent
export const logContent = logJson as LogContent
export const learn = componentsJson as ComponentsContent
export const circuitsContent = circuitsJson as CircuitsContent
