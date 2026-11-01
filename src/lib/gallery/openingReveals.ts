import type {Wall} from '../placement/wallGeometry.ts'
import type {BufferGeometry} from 'three/webgpu'

import {BufferAttribute, Vector3} from 'three/webgpu'

const a = new Vector3
const b = new Vector3
const c = new Vector3
const normal = new Vector3

/**
 * A copy of a flat wall’s surface, in the wall’s own frame, whose triangles come in two groups for two materials: the faces of the wall itself first, then the reveals lining its openings, which face across the opening rather than out of the wall.
 */
export default function withOpeningReveals(surface: BufferGeometry, wall: Pick<Wall, 'curveRadius' | 'holes'>) {
  if (wall.curveRadius) {
    throw new RangeError('Only a flat wall’s openings have reveals to tell apart.')
  }
  const geometry = surface.clone()
  const position = geometry.getAttribute('position')
  const source = geometry.index ? [...geometry.index.array] : Array.from({length: position.count}, (_, index) => index)
  const faces: Array<number> = []
  const reveals: Array<number> = []
  for (let index = 0; index < source.length; index += 3) {
    const corners = [source[index], source[index + 1], source[index + 2]] as const
    a.fromBufferAttribute(position, corners[0])
    b.fromBufferAttribute(position, corners[1])
    c.fromBufferAttribute(position, corners[2])
    const x = (a.x + b.x + c.x) / 3
    const y = (a.y + b.y + c.y) / 3
    normal.subVectors(c, b).cross(a.sub(b)).normalize()
    // Across the opening, within its jambs and under its head.
    const lining = Math.abs(normal.z) < 0.5 && (wall.holes ?? []).some(hole => Math.abs(x - hole.u) <= hole.width / 2 + 1e-3 && y <= hole.height + 1e-3)
    ;(lining ? reveals : faces).push(...corners)
  }
  const indices = [...faces, ...reveals]
  geometry.setIndex(new BufferAttribute(position.count > 65_535 ? Uint32Array.from(indices) : Uint16Array.from(indices), 1))
  geometry.clearGroups()
  geometry.addGroup(0, faces.length, 0)
  geometry.addGroup(faces.length, reveals.length, 1)
  return geometry
}
