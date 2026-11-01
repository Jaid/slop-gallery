import {BufferGeometry, Float32BufferAttribute} from 'three/webgpu'

/** a point of a ramp’s profile: how high it lies how far along it */
export type RampProfilePoint = readonly [along: number, y: number]

/**
 * The walking surface of a ramp `width` meters wide, centered on x, which runs along +z through the points of its profile, straight from one to the next, between two floors that run on level beyond its ends.
 * Its normals bend smoothly along the profile, halfway between both stretches at every point between two, and between its last stretch and the level floor at either end, so the light runs on across them without a crease.
 */
export default function rampSurfaceGeometry(width: number, profile: ReadonlyArray<RampProfilePoint>) {
  if (!(width > 0) || profile.length < 2 || profile.some(([along], index) => index > 0 && !(along > profile[index - 1][0]))) {
    throw new RangeError('A ramp needs a width and at least two points along its profile, in order.')
  }
  const half = width / 2
  const level = [0, 1] as const
  // Facing up, square to every stretch, in the profile’s plane: z, y, the level floors before and after it included.
  const stretches = [level, ...profile.slice(1).map(([along, y], index) => {
    const [fromAlong, fromY] = profile[index]
    const length = Math.hypot(along - fromAlong, y - fromY)
    return [(fromY - y) / length, (along - fromAlong) / length] as const
  }), level]
  const positions: Array<number> = []
  const normals: Array<number> = []
  const indices: Array<number> = []
  for (const [index, [along, y]] of profile.entries()) {
    const before = stretches[index]
    const after = stretches[index + 1]
    const length = Math.hypot(before[0] + after[0], before[1] + after[1])
    const normalZ = (before[0] + after[0]) / length
    const normalY = (before[1] + after[1]) / length
    positions.push(-half, y, along, half, y, along)
    normals.push(0, normalY, normalZ, 0, normalY, normalZ)
    if (!index) {
      continue
    }
    // The stretch from the previous point, both triangles facing up.
    const left = index * 2 - 2
    indices.push(left, left + 2, left + 1, left + 1, left + 2, left + 3)
  }
  const geometry = new BufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
