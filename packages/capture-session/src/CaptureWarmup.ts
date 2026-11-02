export type CaptureWarmupOptions = {
  /** the renderer scale the page warms up at, in the units of its regular scale; without it, or at or above the regular scale, there is no warmup */
  warmupScale?: number
}

type Listener = () => void

/**
 * A capture page’s warmup: until the capture script ends it, the page renders at {@link warmupScale} instead of its regular scale, so everything loads, compiles and streams in while its frames are cheap and the full-size render targets don’t exist yet. The frames to capture then render at the regular scale.
 *
 * Nothing the page loads depends on its resolution, so the full-size frames show the same scene; only temporal effects like TRAA start their history over at the new size, which the script’s settle frames give them. Scripts end it through the app’s `end_warmup` WebMCP tool, see `endWarmup` from `capture-session/script`.
 */
export default class CaptureWarmup {
  getSnapshot = () => this.#active
  subscribe = (listener: Listener) => {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }
  readonly warmupScale: number | undefined
  #active: boolean
  #listeners = new Set<Listener>
  constructor({warmupScale}: CaptureWarmupOptions = {}) {
    if (warmupScale !== undefined && !(Number.isFinite(warmupScale) && warmupScale > 0)) {
      throw new RangeError(`warmupScale must be a positive number, got ${warmupScale}.`)
    }
    this.warmupScale = warmupScale
    this.#active = warmupScale !== undefined
  }

  /** whether the page still renders at the warmup scale */
  get active() {
    return this.#active
  }

  /** Ends the warmup, so the page renders at its regular scale from the next frame on. Returns whether it was still warming. */
  end() {
    if (!this.#active) {
      return false
    }
    this.#active = false
    for (const listener of this.#listeners) {
      listener()
    }
    return true
  }

  /** The scale to render at instead of the regular `scale`: the smaller of the two while warming. */
  scale(scale: number) {
    return this.#active ? Math.min(scale, this.warmupScale!) : scale
  }
}
