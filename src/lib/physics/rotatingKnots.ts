import optis from 'optis'
import readPermalink from 'read-permalink'

const disabledValues = new Set<unknown>([false, 'false', '0'])
const knotRotationSchema = optis({
  defaults: {
    knot_rotation: true,
  },
  normalizations: {
    knot_rotation(value: unknown) {
      return !disabledValues.has(value)
    },
  },
})

/** Read the `?knot_rotation` flag; only `?knot_rotation=false` holds the showcased Knots still, e.g. for renders whose camera orbits one. */
export function readKnotRotation(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: knotRotationSchema}).knot_rotation
}
