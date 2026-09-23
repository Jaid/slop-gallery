import optis from 'optis'
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
