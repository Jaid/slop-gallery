import optis from 'optis'
import readPermalink from 'read-permalink'

const enabledValues = new Set<unknown>([true, '', 'true'])
const telemetrySchema = optis({
  defaults: {
    telemetry: false,
  },
  normalizations: {
    telemetry(value: unknown) {
      return enabledValues.has(value)
    },
  },
})

/** Read the `?telemetry` flag that opts into collecting and sending telemetry; a bare `?telemetry` counts as enabled. */
export function readTelemetry(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: telemetrySchema}).telemetry
}
