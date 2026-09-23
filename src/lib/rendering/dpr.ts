import {createParser} from 'nuqs'

export const dprParser = createParser({
  parse(value) {
    const dpr = Number(value)
    return Number.isFinite(dpr) && dpr > 0 ? dpr : null
  },
  serialize: String,
})

/** Resolve the browser's native pixel ratio when the URL does not override it. */
export function getDeviceDpr() {
  return typeof devicePixelRatio === 'number' && Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1
}
