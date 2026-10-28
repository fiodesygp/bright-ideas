// Typed access to the editable content files in this folder.
// Edit the .json files to change any text; no code changes needed.
import homeJson from './home.json'
import promptsJson from './prompts.json'
import logJson from './log.json'
import componentsJson from './components.json'
import circuitsJson from './circuits.json'

export interface HomeContent {
  appName: string
  tagline: string
  drivingQuestionLabel: string
  drivingQuestion: string
  sections: { to: string; title: string; text: string }[]
}

export interface ReflectionPrompt {
  id: string
  text: string
}

export interface Option {
  id: string
  label: string
  help?: string
  swatch?: string
}

export interface LogContent {
  intro: string
  fields: Record<
    | 'date' | 'height' | 'heightHelp' | 'leafCount' | 'leafColor' | 'soil' | 'soilHelp'
    | 'watered' | 'weather' | 'shade' | 'photo' | 'note' | 'reflection',
    string
  >
  leafColors: Option[]
  soil: Option[]
  weather: Option[]
  shade: Option[]
}

export type PartType = 'panel' | 'led' | 'resistor' | 'motor' | 'pump' | 'clip'

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
  diagram?: { height: number; parts: DiagramPart[]; wires: DiagramWire[] }
  steps?: CircuitStep[]
  success?: string
  troubleshooting?: string[]
}

export interface CircuitsContent {
  intro: string
  circuits: Circuit[]
}

export const home = homeJson as HomeContent
export const reflectionPrompts = (promptsJson as { reflectionPrompts: ReflectionPrompt[] }).reflectionPrompts
export const logContent = logJson as LogContent
export const learn = componentsJson as ComponentsContent
export const circuitsContent = circuitsJson as CircuitsContent
