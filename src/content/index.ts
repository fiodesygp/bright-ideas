// Typed access to the editable content files in this folder.
// Edit the .json files to change any text; no code changes needed.
import homeJson from './home.json'
import logJson from './log.json'
import componentsJson from './components.json'
import settingsJson from './settings.json'
import sundayJson from './sunday.json'

export interface HomeContent {
  appName: string
  tagline: string
  subtitle: string
  drivingQuestionLabel: string
  drivingQuestion: string
  sections: { to: string; title: string; text: string }[]
}

export interface LogContent {
  heading: string
  intro: string
  fields: Record<
    | 'date' | 'height' | 'heightHelp' | 'note' | 'noteHelp' | 'notePlaceholder'
    | 'photo' | 'photoHelp' | 'photoAdd' | 'photoAddHint' | 'photoSkip' | 'photoChange' | 'photoRemove',
    string
  >
  announce: Record<'photoAdded' | 'photoRemoved' | 'saved' | 'changesSaved' | 'switched' | 'adopted' | 'ready' | 'learnerDeleted', string>
  /** Booklet step 3. {n} and {m} are filled in by the app. */
  checklist: Record<
    'legend' | 'help' | 'soil' | 'soilText' | 'water' | 'waterText' | 'ticked' | 'notTicked' | 'watered' | 'soilChecked',
    string
  >
  /** The "About my log" card, like the booklet cover. {name}, {date} and {count} are filled in by the app. */
  about: Record<
    | 'title' | 'intro' | 'name' | 'nameHelp' | 'nameError' | 'plant' | 'plantHelp' | 'startDate' | 'startDateError'
    | 'start' | 'editTitle' | 'addTitle' | 'add' | 'logTitle' | 'noName' | 'plantFallback' | 'started' | 'edit'
    | 'switcher' | 'switcherHelp' | 'current' | 'addSomeone' | 'deleteLog' | 'deleteTitle' | 'deleteText' | 'deleteTip'
    | 'pdfName' | 'pdfPlant' | 'pdfStart' | 'pdfChecklist' | 'pdfMissingChars',
    string
  >
  savedText: string
  newBadge: string
  /** Button words shared by the log's forms and dialogs */
  actions: Record<'saveChanges' | 'cancel' | 'delete', string>
  /** "1 entry", "3 entries" */
  count: Record<'entry' | 'entries', string>
  /** Upload status on the Planting Log. {n} is filled in by the app. */
  sync: Record<'done' | 'waiting' | 'offline', string>
  dashboardIntro: string
  emptyTitle: string
  emptyText: string
}

/** Text on the Settings page. Only the parts about learners and privacy live here so far. {name} and {count} are filled in by the app. */
export type SettingsContent = Record<
  | 'plantNote' | 'plantLink' | 'removeMine' | 'removeHelp' | 'removeTitle' | 'removeText' | 'removeConfirm' | 'removed'
  | 'clearAllText' | 'pdfTip' | 'facilitatorSharedDevice' | 'privacyTitle' | 'privacyText',
  string
>

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

export const home = homeJson as HomeContent
export const logContent = logJson as LogContent
export const learn = componentsJson as ComponentsContent
export const settingsContent = settingsJson as SettingsContent

/**
 * Text on the Simulation page. The type follows sunday.json itself, so a key the
 * app reads can't go missing. {name}-style slots are filled in by the app.
 */
export type SunDayContent = typeof sundayJson
export const sundayContent: SunDayContent = sundayJson
