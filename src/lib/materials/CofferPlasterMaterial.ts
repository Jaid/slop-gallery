import type {FloorRectangle} from '../gallery/floors.ts'
import type {Node} from 'three/webgpu'

import {color, float, normalWorld, positionWorld, vec2} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

export type CofferPlasterOptions = {
  color?: string
  /** world-space glazed fields of the laylights, as seen from below */
  fields: ReadonlyArray<FloorRectangle>
  /** world height of the glass */
  glassY: number
  /** distance in meters at which the glow from the glass has fallen to half */
  reach?: number
  /** linear glow on a face right next to the glass that looks straight at it */
  spill?: number
  spillColor?: string
}

/**
 * Matte ceiling plaster around laylights. Plaster faces turned toward the glass pick up a soft glow from it: strongest right at
 * its edge, gone half a meter away. Faces looking away from the glass, or straight down, get none. The glass is an unlit
 * surface, so without this the beams and frames next to it would stay as dim as anywhere else on the ceiling.
 */
export default class CofferPlasterMaterial extends MeshStandardNodeMaterial {
  constructor({color: base = '#e1dccc', fields, glassY, reach = 0.32, spill = 0.3, spillColor = '#fff2dc'}: CofferPlasterOptions) {
    super({
      color: base,
      roughness: 0.82,
    })
    if (!fields.length) {
      throw new RangeError('Coffer plaster needs at least one laylight field to glow from.')
    }
    if (!(reach > 0) || !(spill >= 0)) {
      throw new RangeError('Coffer plaster needs a positive reach and a non-negative spill.')
    }
    const point = vec2(positionWorld.x, positionWorld.z)
    let nearest: Node<'vec2'> | undefined
    let nearestDistance: Node<'float'> | undefined
    for (const {center, size} of fields) {
      const half = [size[0] / 2, size[1] / 2]
      const closest = point.clamp(vec2(center[0] - half[0], center[1] - half[1]), vec2(center[0] + half[0], center[1] + half[1]))
      const distance = closest.sub(point).length()
      if (nearest && nearestDistance) {
        const closer = distance.lessThan(nearestDistance)
        nearest = closer.select(closest, nearest)
        nearestDistance = closer.select(distance, nearestDistance)
      } else {
        nearest = closest
        nearestDistance = distance
      }
    }
    const toGlass = nearest!.sub(point)
    const horizontal = nearestDistance!
    const drop = float(glassY).sub(positionWorld.y).max(0)
    // Light arrives from the nearest edge of the glass, slightly from above.
    const direction = toGlass.div(horizontal.max(1e-4))
    const facing = normalWorld.x.mul(direction.x).add(normalWorld.z.mul(direction.y)).max(0)
    const reachSquared = horizontal.mul(horizontal).add(drop.mul(drop)).div(reach * reach)
    this.emissiveNode = color(spillColor).mul(float(spill).div(reachSquared.add(1))).mul(facing)
  }
}
