import optis from 'optis'
import readPermalink from 'read-permalink'

type Listener = () => void

const enabledValues = new Set<unknown>([true, '', 'true'])
const crosshairSchema = optis({
  defaults: {
    crosshair: false,
  },
  normalizations: {
    crosshair(value: unknown) {
      return enabledValues.has(value)
    },
  },
})

/** Read the `?crosshair` flag that brings back the aim dot; a bare `?crosshair` counts as enabled. */
export function readCrosshair(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: crosshairSchema}).crosshair
}

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
  constructor(enabled = readCrosshair()) {
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
