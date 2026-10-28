import optis from 'optis'
import readPermalink from 'read-permalink'

const enabledValues = new Set<unknown>([true, '', 'true'])
const albedoSchema = optis({
  defaults: {
    albedo: false,
  },
  normalizations: {
    albedo(value: unknown) {
      return enabledValues.has(value)
    },
  },
})

/** Read the `?albedo` flag that renders every surface in its own unlit color instead of its regular look; a bare `?albedo` counts as enabled. */
export function readAlbedo(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: albedoSchema}).albedo
}

/** whether this page was opened with `?albedo`, read once at startup */
export const isShowingAlbedo = readAlbedo()
