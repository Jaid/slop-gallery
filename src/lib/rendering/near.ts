import optis from 'optis'
import readPermalink, {parseNumber} from 'read-permalink'

const nearSchema = optis({
  normalizations: {
    near(value: unknown) {
      try {
        const near = parseNumber(value)
        if (near > 0) {
          return near
        }
      } catch {
      }
    },
  },
})

/** Read an optional positive near clipping plane override from the permalink, for comparing clipping up close against depth precision far away; `undefined` keeps the renderer’s default. */
export function readNear(input: URL | string = typeof location === 'undefined' ? '' : location.href) {
  return readPermalink(input, {schema: nearSchema}).near
}
