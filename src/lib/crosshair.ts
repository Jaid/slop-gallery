import optis from 'optis'
import readPermalink from 'read-permalink'

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
