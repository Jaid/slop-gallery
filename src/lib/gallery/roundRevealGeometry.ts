import type {Wall, WallOpening} from '../placement/wallGeometry.ts'

import {BufferGeometry, Float32BufferAttribute, Vector2, Vector3} from 'three/webgpu'

import openingOutline from './openingOutline.ts'

/** below this area, twice over, a lofted triangle has collapsed onto a line, like those at an opening’s middle, where the round wall touches the plane */
const degenerate = 1e-12

/**
 * The lining of an opening through a round wall, in the wall’s own frame: from the wall’s center line, where the wall’s own cut through it ends, straight out to the plane touching that line at the opening’s middle, where a straight wall or the open end of a passage meets the round wall back to back.
 * The gap between them widens toward the jambs as the round wall curves away from the plane. The lining closes it round the opening’s jambs and head; its sill is left to the floor.
 * `back` is the opening as it comes out in that plane, centered on the touching point. The lining is lofted between both outlines, point by point, so they need the same profile; its faces are flat and face into the opening.
 */
export default function roundRevealGeometry(wall: Pick<Wall, 'curveRadius'>, hole: WallOpening, back: Omit<WallOpening, 'u'>) {
  const radius = wall.curveRadius
  if (radius === undefined || !(radius > 0)) {
    throw new RangeError('A round reveal needs a wall that curves round its room.')
  }
  if (hole.profile !== back.profile) {
    throw new RangeError('An opening and the back it is lined out to need the same profile.')
  }
  // In the wall’s frame, x runs along it at its middle, z into the room, and its bend centers at z = radius.
  const onWall = (u: number, y: number) => new Vector3(Math.sin(u / radius) * radius, y, radius - Math.cos(u / radius) * radius)
  const turn = hole.u / radius
  const touch = onWall(hole.u, 0)
  const tangent = new Vector3(Math.cos(turn), 0, Math.sin(turn))
  const front = openingOutline(hole).map(({x, y}) => onWall(x, y))
  const backOutline = openingOutline({
    ...back,
    u: 0,
  })
  const rear = backOutline.map(({x, y}) => touch.clone().addScaledVector(tangent, x).setY(y))
  const middle = backOutline.reduce((sum, point) => sum.add(point), new Vector2).multiplyScalar(1 / backOutline.length)
  const positions: Array<number> = []
  const normals: Array<number> = []
  const corner = new Vector3
  const ab = new Vector3
  const ac = new Vector3
  // Round the outline from the bottom of the right jamb, over the head and down the left jamb, leaving out its bottom edge, the sill.
  for (let i = 1; i < front.length; i++) {
    const next = (i + 1) % front.length
    const edge = backOutline[next].clone().sub(backOutline[i])
    const inward = new Vector2(-edge.y, edge.x)
    inward.normalize()
    if (inward.dot(middle.clone().sub(backOutline[i])) < 0) {
      inward.negate()
    }
    const normal = tangent.clone().multiplyScalar(inward.x).setY(inward.y)
    const quad = [front[i], front[next], rear[next], rear[i]]
    for (const triangle of [[0, 1, 2], [0, 2, 3]]) {
      const [a, b, c] = triangle.map(index => quad[index])
      const facing = corner.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a))
      if (facing.lengthSq() < degenerate) {
        continue
      }
      for (const point of facing.dot(normal) < 0 ? [a, c, b] : [a, b, c]) {
        positions.push(point.x, point.y, point.z)
        normals.push(normal.x, normal.y, normal.z)
      }
    }
  }
  const geometry = new BufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
