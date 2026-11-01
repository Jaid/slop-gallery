import type {Vec3} from './types.ts'
import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, CircleGeometry, CylinderGeometry, TorusGeometry} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'

/** how far below the ceiling the thrower’s pivot hangs, where its yoke holds the barrel */
const hang = 0.55
/** the barrel round the lamp, along its beam from behind the pivot to the lens in front of it */
const barrel = {
  radius: 0.11,
  back: -0.17,
  front: 0.17,
}
/** how far the yoke’s arms stand out from the beam to either side, and how high its bar spans over the pivot */
const yoke = {
  side: 0.16,
  top: 0.2,
}
/** the four barn doors round the lens, flared out from the beam so they never cut into its cone */
const barnDoor = {
  width: 0.17,
  length: 0.1,
  flare: 0.5,
}
/** where the light shines from along the beam, in front of the lens, so the barrel cannot shadow its own source */
const sourceOffset = barrel.front + 0.07

/** how a thrower hanging from the ceiling at some point turns to aim at a target */
export type ThrowerAim = {
  /** its turn about y, which points the beam toward the target across the floor plan */
  pan: number
  /** where its yoke holds the barrel */
  pivot: Vec3
  /** where its light shines from, just in front of the lens */
  source: Vec3
  /** how far the barrel tips its beam down from level, in radians */
  tilt: number
}

/** How a thrower hanging from `ceiling`, a point on the ceiling, aims its beam at `target`. */
export function aimThrower([x, y, z]: Vec3, target: Vec3): ThrowerAim {
  const pivot: Vec3 = [x, y - hang, z]
  const [dx, dy, dz] = target.map((value, index) => value - pivot[index]) as unknown as Vec3
  const distance = Math.hypot(dx, dy, dz)
  return {
    pan: Math.atan2(dx, dz),
    pivot,
    source: [pivot[0] + dx / distance * sourceOffset, pivot[1] + dy / distance * sourceOffset, pivot[2] + dz / distance * sourceOffset],
    tilt: Math.atan2(-dy, Math.hypot(dx, dz)),
  }
}

/**
 * A theater’s spotlight thrower in black painted metal, hanging from the ceiling on a stem, the y axis up through its pivot and its beam along z.
 *
 * The {@link mount} turns with the thrower’s pan: a canopy on the ceiling, the stem and the yoke whose arms hold the barrel at its pivot. The {@link barrel} tips with its tilt as well: a ribbed body, a capped back, a bezel round the glowing {@link lens} and four barn doors flared round it.
 */
export default class SpotlightThrowerGeometry {
  readonly barrel: BufferGeometry
  readonly lens: CircleGeometry
  readonly mount: BufferGeometry

  constructor() {
    const canopy = new CylinderGeometry(0.07, 0.07, 0.03, 32)
    const stem = new CylinderGeometry(0.016, 0.016, hang - yoke.top, 12)
    const bar = new BoxGeometry(yoke.side * 2 + 0.025, 0.025, 0.05)
    const mount: Array<BufferGeometry> = [
      canopy.translate(0, hang - 0.015, 0),
      stem.translate(0, (hang + yoke.top) / 2, 0),
      bar.translate(0, yoke.top, 0),
    ]
    for (const side of [-1, 1]) {
      const arm = new BoxGeometry(0.025, yoke.top, 0.05)
      const knob = new CylinderGeometry(0.032, 0.032, 0.03, 20)
      mount.push(arm.translate(side * yoke.side, yoke.top / 2, 0), knob.rotateZ(Math.PI / 2).translate(side * (yoke.side + 0.02), 0, 0))
    }
    this.mount = mergeParts(mount)
    const length = barrel.front - barrel.back
    const body = new CylinderGeometry(barrel.radius, barrel.radius, length, 40)
    const cap = new CylinderGeometry(barrel.radius * 0.7, barrel.radius * 0.9, 0.05, 40)
    const bezel = new TorusGeometry(barrel.radius - 0.008, 0.012, 10, 40)
    const parts: Array<BufferGeometry> = [
      body.rotateX(Math.PI / 2).translate(0, 0, (barrel.front + barrel.back) / 2),
      cap.rotateX(-Math.PI / 2).translate(0, 0, barrel.back - 0.025),
      bezel.translate(0, 0, barrel.front),
    ]
    // Cooling ribs round the back half of the body.
    for (let index = 0; index < 5; index++) {
      const rib = new CylinderGeometry(barrel.radius + 0.012, barrel.radius + 0.012, 0.008, 40)
      parts.push(rib.rotateX(Math.PI / 2).translate(0, 0, barrel.back + 0.025 + index * 0.03))
    }
    for (let side = 0; side < 4; side++) {
      // Hinged at the bezel and flared out, then turned round the beam to each side of the lens.
      const door = new BoxGeometry(barnDoor.width, 0.004, barnDoor.length)
      door.translate(0, 0, barnDoor.length / 2).rotateX(-barnDoor.flare).translate(0, barrel.radius + 0.004, barrel.front + 0.005)
      parts.push(door.rotateZ(side * Math.PI / 2))
    }
    this.barrel = mergeParts(parts)
    // Facing out along the beam, just in front of the body’s closed end, inside the bezel.
    const lens = new CircleGeometry(barrel.radius - 0.012, 40)
    this.lens = lens.translate(0, 0, barrel.front + 0.003)
  }

  dispose() {
    this.mount.dispose()
    this.barrel.dispose()
    this.lens.dispose()
  }
}
