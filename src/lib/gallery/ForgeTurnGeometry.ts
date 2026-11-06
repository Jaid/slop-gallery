import type {BufferGeometry} from 'three/webgpu'

import {Curve, ExtrudeGeometry, Path, Quaternion, RingGeometry, Shape, TubeGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {wallFace} from './architectureDimensions.ts'
import {forgeVestibule} from './forge.ts'
import {forgeTurn, forgeTurnHoleHalfWidth} from './forgeTurn.ts'

/** how many pieces the bore’s collider is cut into along the pipe and round it: finely enough for an orb pressed onto the loop at many times its weight to slide round it without knocking against their seams, which would cost it most of its speed */
const collision = [1500, 48] as const
/** how many pieces the brass is cut into along the pipe and round it */
const visible = [320, 24] as const
/** how far each wall plate reaches out past the hole it covers, and how thick it is */
const plate = [0.04, 0.012] as const
const forward = new Vector3(0, 0, 1)
/** A tube along the curve facing inward, like the bore an orb slides through. */
function bore(curve: ForgeTurnCurve, [segments, sides]: readonly [number, number]) {
  const tube = new TubeGeometry(curve, segments, forgeTurn.bore, sides, false)
  const indices = tube.getIndex()!
  for (let index = 0; index < indices.count; index += 3) {
    const first = indices.getX(index)
    indices.setX(index, indices.getX(index + 2))
    indices.setX(index + 2, first)
  }
  const normals = tube.getAttribute('normal')
  for (let index = 0; index < normals.count; index++) {
    normals.setXYZ(index, -normals.getX(index), -normals.getY(index), -normals.getZ(index))
  }
  return tube
}
/** The brass plate on the face of the vestibule’s wall round the pipe where its mouth runs in, falling steeply, covering the hole: its inner edge round the pipe’s section on the face, stretched by its fall, its outer edge round the hole, bent round the wall’s curve. */
function wallPlate() {
  const outside = forgeTurn.bore + forgeTurn.thickness
  const stretch = Math.hypot(1, forgeTurn.fall(forgeTurn.faces.inlet))
  const [x, y, z] = forgeTurn.at(forgeTurn.faces.inlet).point
  const shape = new Shape
  shape.absarc(0, 0, forgeTurnHoleHalfWidth() + plate[0], 0, Math.PI * 2, false)
  const hole = new Path
  hole.absellipse(0, 0, outside, outside * stretch, 0, Math.PI * 2, true, 0)
  shape.holes.push(hole)
  const geometry = new ExtrudeGeometry(shape, {
    depth: plate[1],
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.003,
    bevelThickness: 0.003,
    curveSegments: 48,
  })
  // Its back a hair into the wall, bent round toward the vestibule’s middle as the wall’s face curves away from the plate’s middle
  const face = forgeVestibule.radius - wallFace
  const positions = geometry.getAttribute('position')
  for (let index = 0; index < positions.count; index++) {
    const across = positions.getX(index)
    positions.setZ(index, positions.getZ(index) - 0.004 + face - Math.sqrt(face ** 2 - across ** 2))
  }
  geometry.computeVertexNormals()
  const [centerX, centerZ] = forgeVestibule.center
  const inward = new Vector3(centerX - x, 0, centerZ - z)
  const turn = new Quaternion
  turn.setFromUnitVectors(forward, inward.normalize())
  return geometry.applyQuaternion(turn).translate(x, y, z)
}
/**
 * The redirection pipe, see {@link forgeTurn}, in the world’s frame: its brass `pipe`, open at its mouth and its outlet, with a plate round it on the vestibule’s wall where its mouth runs in, and its bore as `collision`.
 */
export default class ForgeTurnGeometry {
  readonly collision: BufferGeometry
  readonly pipe: BufferGeometry

  constructor() {
    const curve = new ForgeTurnCurve
    const outside = forgeTurn.bore + forgeTurn.thickness
    this.collision = bore(curve, collision)
    const parts: Array<BufferGeometry> = [bore(curve, visible), new TubeGeometry(curve, visible[0], outside, visible[1], false)]
    for (const t of [0, 1]) {
      const point = curve.getPoint(t)
      const turn = new Quaternion
      turn.setFromUnitVectors(forward, curve.getTangent(t).multiplyScalar(t === 0 ? -1 : 1))
      const rim = new RingGeometry(forgeTurn.bore, outside, visible[1])
      parts.push(rim.applyQuaternion(turn).translate(point.x, point.y, point.z))
    }
    parts.push(wallPlate())
    this.pipe = mergeParts(parts)
  }

  dispose() {
    this.pipe.dispose()
    this.collision.dispose()
  }
}

/** the pipe’s middle as a curve, from its mouth at 0 to its outlet at 1 */
class ForgeTurnCurve extends Curve<Vector3> {
  constructor() {
    super()
    this.arcLengthDivisions = 2000
  }

  getPoint(t: number, target = new Vector3) {
    return target.set(...forgeTurn.at(t * forgeTurn.length).point)
  }

  getTangent(t: number, target = new Vector3) {
    return target.set(...forgeTurn.at(t * forgeTurn.length).direction)
  }
}
