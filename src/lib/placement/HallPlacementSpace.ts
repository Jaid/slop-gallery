import type {Vec3} from '../gallery/types.ts'
import type {Wall} from './wallGeometry.ts'

import {PlacementSpace} from './base/PlacementSpace.ts'

export type HallBounds = {
  height: number
  maxX: number
  minX: number
  northZ: number
  southZ: number
}

/**
 * A single sealed hall with a level floor at y = 0, like Knottingham’s Arena or the Sandbox’s Cell.
 *
 * Its size can change between visits, with the catalog or URL parameters, so stored artworks are settled into the current walls when a collection loads.
 */
export class HallPlacementSpace extends PlacementSpace {
  readonly recoveryPosition: Vec3

  constructor(readonly walls: ReadonlyArray<Wall>, readonly bounds: HallBounds, recoveryPosition: Vec3) {
    super()
    if (!this.contains(recoveryPosition)) {
      throw new RangeError('Artworks have to recover inside the hall.')
    }
    this.recoveryPosition = [...recoveryPosition]
  }

  /** Anywhere between the walls, floor and ceiling, with a little slack for bodies resting against them. */
  contains([x, y, z]: Vec3) {
    return Number.isFinite(x + y + z) && x >= this.bounds.minX && x <= this.bounds.maxX && z >= this.bounds.northZ && z <= this.bounds.southZ && y >= -1 && y <= this.bounds.height + 0.2
  }

  floorHeight(_position: Vec3) {
    return 0
  }

  /** How far a ray travels to the nearest of the hall’s walls, or Infinity if it meets none; interaction occlusion follows them alone, never anything standing in the hall. */
  wallDistance(origin: Vec3, direction: Vec3) {
    if (!origin.every(Number.isFinite) || !direction.every(Number.isFinite)) {
      return Infinity
    }
    let nearest = Infinity
    for (const wall of this.walls) {
      const sin = Math.sin(wall.rotation)
      const cos = Math.cos(wall.rotation)
      const facing = direction[0] * sin + direction[2] * cos
      if (Math.abs(facing) < 1e-12) {
        continue
      }
      const distance = ((wall.center[0] - origin[0]) * sin + (wall.center[2] - origin[2]) * cos) / facing
      if (distance < 0 || distance >= nearest) {
        continue
      }
      const x = origin[0] + direction[0] * distance - wall.center[0]
      const y = origin[1] + direction[1] * distance - wall.center[1]
      const z = origin[2] + direction[2] * distance - wall.center[2]
      const u = x * cos - z * sin
      if (Math.abs(u) <= wall.width / 2 + 1e-9 && y >= 0 && y <= wall.height) {
        nearest = distance
      }
    }
    return nearest === Infinity ? Infinity : nearest * Math.hypot(...direction)
  }
}
