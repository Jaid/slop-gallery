import optis from 'optis'
import {useSyncExternalStore} from 'react'
import readPermalink, {parseNumber} from 'read-permalink'

const scaleSchema = optis({
  normalizations: {
    scale(value: unknown) {
      try {
        const scale = parseNumber(value)
        if (scale > 0) {
          return scale
        }
      } catch {
      }
    },
  },
})

/** Read an optional positive renderer scale override from the permalink. */
export function readScale(input: URL | string = typeof location === 'undefined' ? '' : location.href) {
  return readPermalink(input, {schema: scaleSchema}).scale
}

const getDevicePixelRatio = () => (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)
// devicePixelRatio has no change event, but a resolution query that matches its current value stops matching on browser zoom and display changes.
const subscribeDevicePixelRatio = (onChange: () => void) => {
  let query: MediaQueryList | undefined
  const listen = () => {
    query?.removeEventListener('change', listen)
    query = matchMedia(`(resolution: ${getDevicePixelRatio()}dppx)`)
    query.addEventListener('change', listen)
    onChange()
  }
  listen()
  return () => query?.removeEventListener('change', listen)
}

/** Renderer pixels per physical display pixel times `scale`, so browser zoom changes the UI size but neither the sharpness nor the cost of the canvas. */
export function useZoomIndependentDpr(scale: number) {
  return scale * useSyncExternalStore(subscribeDevicePixelRatio, getDevicePixelRatio, () => 1)
}
