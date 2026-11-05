import type {BufferGeometry} from 'three/webgpu'

import {Curve, Quaternion, RingGeometry, TorusGeometry, TubeGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {cannonLaunch, flight, physicsSteps} from './alchemy/alchemyMachine.ts'
import {wallFace} from './architectureDimensions.ts'
import {forgeVestibule} from './forge.ts'
import {rod} from './lodgeInterior/place.ts'

/** A descending 270° sweep in the vestibule’s north half, tangent to the incoming shot and leaving west along the Bastion’s approach. */
export class ForgeTurn extends Curve<Vector3> {
  readonly bore = 0.21
  readonly grade: number
  readonly inlet: Vector3
  readonly radius = 0.95
  readonly sweep = Math.PI * 1.5
  readonly thickness = 0.012

  constructor() {
    super()
    const z = forgeVestibule.center[1] - this.radius
    let previous = cannonLaunch.position
    let step = 0
    for (const point of flight(cannonLaunch.position, cannonLaunch.velocity)) {
      step++
      if (point[2] <= z) {
        const share = (previous[2] - z) / (previous[2] - point[2])
        this.inlet = new Vector3(point[0], previous[1] + (point[1] - previous[1]) * share, z)
        const time = (step - 1 + share) / physicsSteps.rate
        this.grade = (cannonLaunch.velocity[1] - 9.81 * time) / cannonLaunch.velocity[2]
        return
      }
      previous = point
    }
    throw new Error('The cannon’s shot never reaches the pipe.')
  }

  getPoint(t: number, target = new Vector3) {
    const angle = this.sweep * t
    return target.set(this.inlet.x + this.radius * (1 - Math.cos(angle)), this.inlet.y - this.grade * this.radius * angle, this.inlet.z - this.radius * Math.sin(angle))
  }

  getTangent(t: number, target = new Vector3) {
    const angle = this.sweep * t
    return target.set(Math.sin(angle), -this.grade, -Math.cos(angle)).normalize()
  }
}

export const forgeTurn = new ForgeTurn

/** An open-ended brass pipe with a continuous polished bore and three iron clamps fixed to the vestibule’s north wall. */
export default class ForgeTurnGeometry {
  readonly brackets: BufferGeometry
  readonly collision: BufferGeometry
  readonly pipe: BufferGeometry

  constructor() {
    const {bore, thickness} = forgeTurn
    const outside = bore + thickness
    const segments = 256
    const sides = 32
    const inner = new TubeGeometry(forgeTurn, segments, bore, sides, false)
    // TubeGeometry faces outward; the bore faces the orb inside it instead.
    const indices = inner.getIndex()!
    for (let index = 0; index < indices.count; index += 3) {
      const first = indices.getX(index)
      indices.setX(index, indices.getX(index + 2))
      indices.setX(index + 2, first)
    }
    const normals = inner.getAttribute('normal')
    for (let index = 0; index < normals.count; index++) {
      normals.setXYZ(index, -normals.getX(index), -normals.getY(index), -normals.getZ(index))
    }
    this.collision = inner.clone()
    const parts: Array<BufferGeometry> = [inner, new TubeGeometry(forgeTurn, segments, outside, sides, false)]
    const forward = new Vector3(0, 0, 1)
    for (const t of [0, 1]) {
      const point = forgeTurn.getPoint(t)
      const turn = new Quaternion
      turn.setFromUnitVectors(forward, forgeTurn.getTangent(t).multiplyScalar(t === 0 ? -1 : 1))
      const rim = new RingGeometry(bore, outside, sides)
      parts.push(rim.applyQuaternion(turn).translate(point.x, point.y, point.z))
    }
    this.pipe = mergeParts(parts)
    const supports: Array<BufferGeometry> = []
    const [cx, cz] = forgeVestibule.center
    for (const t of [0.12, 0.45, 0.78]) {
      const point = forgeTurn.getPoint(t)
      const tangent = forgeTurn.getTangent(t)
      const turn = new Quaternion
      turn.setFromUnitVectors(forward, tangent)
      const clamp = new TorusGeometry(outside + 0.014, 0.012, 8, sides)
      supports.push(clamp.applyQuaternion(turn).translate(point.x, point.y, point.z))
      const radial = new Vector3(point.x - cx, 0, point.z - cz)
      radial.normalize()
      const wall = new Vector3(cx, point.y, cz)
      wall.addScaledVector(radial, forgeVestibule.radius - wallFace + 0.01)
      for (const side of [-1, 1]) {
        const from = point.clone().addScaledVector(tangent, side * 0.06).addScaledVector(radial, outside)
        supports.push(rod(from, wall.clone().addScaledVector(tangent, side * 0.06), 0.014, 8))
      }
    }
    this.brackets = mergeParts(supports)
  }

  dispose() {
    this.pipe.dispose()
    this.brackets.dispose()
    this.collision.dispose()
  }
}
