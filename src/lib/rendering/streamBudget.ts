import optis from 'optis'
import readPermalink, {parseNumber} from 'read-permalink'

/** milliseconds a streaming frame may spend building objects, or `false` for no limit */
export type StreamBudget = false | number

/** what players stream with: it gets the rest of the scene in 10–20% sooner than 4 ms with slowest frames about as long, while larger budgets lengthen them without reliably getting there sooner */
export const defaultStreamBudget = 8

/** A `?stream_budget` value as milliseconds from 0 up, or `false`, or `undefined` for anything else. */
export function parseStreamBudget(value: unknown): StreamBudget | undefined {
  if (value === false || value === 'false') {
    return false
  }
  try {
    const milliseconds = parseNumber(value)
    if (milliseconds >= 0) {
      return milliseconds
    }
  } catch {
  }
}

const schema = optis({
  normalizations: {
    stream_budget: parseStreamBudget,
  },
})

/**
 * Read `?stream_budget`, the milliseconds a frame after the loading screen may spend building objects that a pass hasn’t drawn yet; a frame always builds at least one.
 * `false` builds everything in the first frame, so every pipeline compiles in parallel: the scene is complete about three times sooner, after a freeze of a few seconds.
 * Without it, `?test=true` pages, like those of the headless capture scripts, stream without a limit, and everyone else with {@link defaultStreamBudget}.
 */
export function readStreamBudget(input: URL | string = typeof location === 'undefined' ? '' : location.href): StreamBudget {
  const budget = readPermalink(input, {schema}).stream_budget
  if (budget !== undefined) {
    return budget
  }
  const url = new URL(input, 'http://localhost/')
  return url.searchParams.get('test') === 'true' ? false : defaultStreamBudget
}
