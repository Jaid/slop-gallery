import optis from 'optis'
import readPermalink from 'read-permalink'

/** `always` shows the aim dot like `true`, but also keeps it through V viewing and zoom */
export type CrosshairFlag = 'always' | boolean

type Listener = () => void

const enabledValues = new Set<unknown>([true, '', 'true'])
const crosshairSchema = optis({
  defaults: {
    crosshair: false,
  },
  normalizations: {
    crosshair(value: unknown): CrosshairFlag {
      if (value === 'always') {
        return 'always'
      }
      return enabledValues.has(value)
    },
  },
})

/** Read the `?crosshair` flag that brings back the aim dot; a bare `?crosshair` counts as enabled and `?crosshair=always` also keeps it through V viewing and zoom. */
export function readCrosshair(input: URL | string = typeof location === 'undefined' ? '' : location.href): CrosshairFlag {
  return readPermalink(input, {schema: crosshairSchema}).crosshair
}

/** whether this page was opened with `?crosshair=always`, read once at startup */
export const crosshairAlways = readCrosshair() === 'always'

/** key that shows or hides the aim dot while playing */
export const crosshairToggleKey = 'KeyH'

/** The player’s choice to show the aim dot, starting from `?crosshair` and flipped with H for the rest of the page session. */
export class CrosshairPreference {
  getSnapshot = () => this.#enabled
  subscribe = (listener: Listener) => {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }
  #enabled: boolean
  #listeners = new Set<Listener>
  constructor(enabled = readCrosshair() !== false) {
    this.#enabled = enabled
  }
  set(enabled: boolean) {
    if (enabled === this.#enabled) {
      return
    }
    this.#enabled = enabled
    for (const listener of this.#listeners) {
      listener()
    }
  }
  toggle() {
    this.set(!this.#enabled)
    return this.#enabled
  }
}

const crosshair = new CrosshairPreference

export default crosshair
