import type {Wall} from '../placement/wallGeometry.ts'

type Point = readonly [number, number]

/** world xz of a wall’s two ends: its own −x end first */
function wallEnds(wall: Wall): [Point, Point] {
  const [x, , z] = wall.center
  const dx = Math.cos(wall.rotation) * wall.width / 2
  const dz = -Math.sin(wall.rotation) * wall.width / 2
  return [[x - dx, z - dz], [x + dx, z + dz]]
}
/** the direction a wall’s face looks into its room, in world xz */
function inward(wall: Wall): Point {
  return [Math.sin(wall.rotation), Math.cos(wall.rotation)]
}
/** Walls whose trim bands can share a miter: level, straight and with the same profile at the same height. */
function trimKey(wall: Wall) {
  if (wall.trimStyle === 'none' || wall.baseboardProfile || wall.slope || wall.curveRadius) {
    return
  }
  return JSON.stringify([wall.center[1], wall.height, wall.trimStyle ?? 'classic', wall.baseboardHeight ?? 0.44])
}
const tolerance = 1e-6

/**
 * Marks the wall ends that meet another wall in an inside corner, so `createArchitectureGeometry` miters their baseboards and cornices.
 *
 * Both walls of a corner run their trim to the corner, where the bands would otherwise overlap in a square and share their tops,
 * bottoms and fronts. Mitered at 45°, the two bands only touch along the miter.
 */
export default function miterCorners(walls: ReadonlyArray<Wall>): Array<Wall> {
  // Marks from an earlier pass are recomputed, not kept.
  return walls.map(({miters: _, ...wall}, wallIndex) => {
    const key = trimKey(wall)
    if (key === undefined) {
      return wall
    }
    const ends = wallEnds(wall)
    const miters = ends.map((end, index) => {
      // from this end toward the wall’s middle
      const along: Point = [ends[1 - index][0] - end[0], ends[1 - index][1] - end[1]]
      const length = Math.hypot(...along)
      const toward: Point = [along[0] / length, along[1] / length]
      return walls.some((other, otherIndex) => {
        if (otherIndex === wallIndex || trimKey(other) !== key) {
          return false
        }
        const otherEnds = wallEnds(other)
        const shared = otherEnds.findIndex(point => Math.hypot(point[0] - end[0], point[1] - end[1]) < tolerance)
        if (shared === -1) {
          return false
        }
        const far = otherEnds[1 - shared]
        const otherLength = Math.hypot(far[0] - end[0], far[1] - end[1])
        const otherToward: Point = [(far[0] - end[0]) / otherLength, (far[1] - end[1]) / otherLength]
        const [nx, nz] = inward(wall)
        const [ox, oz] = inward(other)
        // An inside corner: each wall runs off into the room the other one faces.
        return otherToward[0] * nx + otherToward[1] * nz > 1 - tolerance && toward[0] * ox + toward[1] * oz > 1 - tolerance
      })
    }) as [boolean, boolean]
    return miters.some(Boolean) ? {
      ...wall,
      miters,
    } : wall
  })
}
