import optis from 'optis'
import readPermalink, {parseNumber} from 'read-permalink'

const dprSchema = optis({
  normalizations: {
    dpr(value: unknown) {
      try {
        const dpr = parseNumber(value)
        return dpr > 0 ? dpr : undefined
      } catch {
        return undefined
      }
    },
  },
})

export function readDpr(input: string | URL = typeof location === 'undefined' ? '' : location.href) {
  return readPermalink(input, {schema: dprSchema}).dpr
}

/** Performance stays at 1×; quality follows the display with a 1.5× floor. */
export function getDefaultDpr(isQuality: boolean) {
  if (!isQuality) {
    return 1
  }
  const deviceDpr = typeof devicePixelRatio === 'number' && Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1
  return Math.max(1.5, deviceDpr)
}
