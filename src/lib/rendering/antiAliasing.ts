import optis from 'optis'
import readPermalink from 'read-permalink'

const antiAliasingMethods = ['traa', 'smaa'] as const

export type AntiAliasing = typeof antiAliasingMethods[number] | false

const antiAliasingSchema = optis({
  normalizations: {
    anti_aliasing(value: unknown): AntiAliasing | undefined {
      if (value === 'false') {
        return false
      }
      return antiAliasingMethods.find(method => method === value)
    },
  },
})

/** Read an explicit antialiasing override; `undefined` leaves the choice to the graphics mode. */
export function readAntiAliasing(input: URL | string = typeof location === 'undefined' ? '' : location.href): AntiAliasing | undefined {
  return readPermalink(input, {schema: antiAliasingSchema}).anti_aliasing
}

/** Heavy mode resolves temporally by default, fast mode renders without antialiasing. */
export function getAntiAliasing(isHeavy: boolean, requested = readAntiAliasing()): AntiAliasing {
  if (requested !== undefined) {
    return requested
  }
  return isHeavy ? 'traa' : false
}
