import {createParser} from 'nuqs'

export const dprParser = createParser({
  parse(value) {
    const dpr = Number(value)
    return Number.isFinite(dpr) && dpr > 0 ? dpr : null
  },
  serialize: String,
})

/** Performance stays at 1×; quality follows the display with a 1.5× floor. */
export function getDefaultDpr(isQuality: boolean) {
  if (!isQuality) {
    return 1
  }
  const deviceDpr = typeof devicePixelRatio === 'number' && Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1
  return Math.max(1.5, deviceDpr)
}
