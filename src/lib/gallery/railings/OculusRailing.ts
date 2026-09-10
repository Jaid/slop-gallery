import type {Vec3} from '../types.ts'
import type {RailingAnchor} from './RailingPath.ts'

import {oculusRamps} from '../lowerGallery.ts'
import {towerRamp as ramp, oculusTower as tower, towerPlatformOutline, towerRampHeight} from '../oculusTower.ts'
import {RailingPath} from './RailingPath.ts'

export class OculusRailing extends RailingPath {
  constructor() {
    const inset = 0.12
    const west = oculusRamps.find(value => value.side === 'west')!
    const left: Array<RailingAnchor> = []
    const add = (ground: Vec3, height = ramp.railHeight) => {
      const previous = left.at(-1)
      if (!previous || Math.hypot(...ground.map((value, i) => value - previous.ground[i]!)) > 0.000_01 || height !== previous.height) {
        left.push({
          ground,
          height,
        })
      }
    }
    const lowerX = west.x + west.width / 2 - inset
    add([lowerX, west.floorY, west.startZ])
    add([lowerX, west.floorY + west.rise, west.startZ - west.run])
    // Round the turn onto the base without cutting across the opening beside the lower slope.
    for (let i = 1; i <= 12; i++) {
      const theta = Math.PI + i / 12 * Math.PI / 2
      add([lowerX + inset + Math.cos(theta) * inset, ramp.startY, ramp.startZ + Math.sin(theta) * inset])
    }
    const cornerX = tower.x - ramp.width / 2 - ramp.baseCornerRadius
    add([cornerX, ramp.startY, ramp.startZ - inset])
    // Follow the rounded base corner at a constant inset from its exposed edge.
    for (let i = 1; i <= 40; i++) {
      const theta = i / 40 * Math.PI / 2
      const z = ramp.startZ + ramp.baseCornerRadius - (ramp.baseCornerRadius + inset) * Math.cos(theta)
      add([cornerX + (ramp.baseCornerRadius + inset) * Math.sin(theta), towerRampHeight((z - ramp.startZ) / (ramp.endZ - ramp.startZ)), z])
    }
    const straightStart = ramp.startZ + ramp.baseCornerRadius
    for (let i = 1; i <= 64; i++) {
      const z = straightStart + (ramp.endZ - straightStart) * i / 64
      const transition = Math.max(0, Math.min(1, (z - (ramp.endZ - 0.65)) / 0.65))
      const height = ramp.railHeight * (1 - 0.5 * transition * transition * (3 - 2 * transition))
      add([tower.x - ramp.width / 2 + inset, towerRampHeight((z - ramp.startZ) / (ramp.endZ - ramp.startZ)), z], height)
    }
    // Offset the open perimeter, not its closing entrance chord. Offsetting the
    // chord pulls the endpoints forward and makes the rail double back at the shoulders.
    const outline = [towerPlatformOutline[0]!, ...towerPlatformOutline.slice(1, -1).toReversed()]
    const perimeter = outline.map((point, i): RailingAnchor => {
      if (i === 0 || i === outline.length - 1) {
        return {
          ground: [tower.x + point[0] + (i === 0 ? inset : -inset), ramp.endY, tower.z + point[1]],
          height: ramp.railHeight / 2,
        }
      }
      const previous = outline[i - 1]!
      const next = outline[i + 1]!
      const before = [point[0] - previous[0], point[1] - previous[1]]
      const after = [next[0] - point[0], next[1] - point[1]]
      const beforeLength = Math.hypot(...before)
      const afterLength = Math.hypot(...after)
      const n1 = [before[1]! / beforeLength, -before[0]! / beforeLength]
      const n2 = [after[1]! / afterLength, -after[0]! / afterLength]
      const scale = inset / (1 + n1[0]! * n2[0]! + n1[1]! * n2[1]!)
      return {
        ground: [tower.x + point[0] + (n1[0]! + n2[0]!) * scale, ramp.endY, tower.z + point[1] + (n1[1]! + n2[1]!) * scale],
        height: ramp.railHeight / 2,
      }
    })
    const towerLeft = perimeter[0]!
    add(towerLeft.ground, towerLeft.height)
    // One open path runs up the west ramp, around the tower and down the east ramp.
    // The entrance chord is deliberately omitted, keeping the tower accessible.
    const right = left.map(({ground, height}): RailingAnchor => ({
      ground: [2 * tower.x - ground[0], ground[1], ground[2]],
      height,
    })).toReversed()
    super([...left, ...perimeter.slice(1), ...right.slice(1)])
  }
}
