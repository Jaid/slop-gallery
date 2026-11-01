import optis from 'optis'
import readPermalink, {parseNumber} from 'read-permalink'

const fovSchema = optis({
  normalizations: {
    fov(value: unknown) {
      try {
        const fov = parseNumber(value)
        if (fov > 0 && fov < 180) {
          return fov
        }
      } catch {
      }
    },
  },
})

/** Read an optional vertical field of view in degrees, above 0 and below 180, for the game camera from the permalink; `undefined` keeps the default. */
export function readFov(input: URL | string = typeof location === 'undefined' ? '' : location.href) {
  return readPermalink(input, {schema: fovSchema}).fov
}
