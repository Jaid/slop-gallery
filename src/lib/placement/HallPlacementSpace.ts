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
 * A single sealed hall with a level floor at y = 0, like Knottingham.
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
}
