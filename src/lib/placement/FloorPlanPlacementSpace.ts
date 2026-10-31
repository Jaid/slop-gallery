import type {Vec3} from '../gallery/types.ts'
import type {Wall} from './wallGeometry.ts'

import {PlacementSpace} from './base/PlacementSpace.ts'

/**
 * A sealed space with a level floor at y = 0 under a floor plan of any shape, like the Sandbox’s Cell with its round vestibule.
 */
export class FloorPlanPlacementSpace extends PlacementSpace {
  readonly recoveryPosition: Vec3

  /**
   * @param inside whether a point on the floor plan, in world x and z, lies within it
   * @param height how high the ceiling hangs over the floor
   */
  constructor(readonly walls: ReadonlyArray<Wall>, private readonly inside: (x: number, z: number) => boolean, readonly height: number, recoveryPosition: Vec3) {
    super()
    if (!this.contains(recoveryPosition)) {
      throw new RangeError('Artworks have to recover inside the floor plan.')
    }
    this.recoveryPosition = [...recoveryPosition]
  }

  /** Anywhere over the floor plan between floor and ceiling, with a little slack for bodies resting against them. */
  contains([x, y, z]: Vec3) {
    return Number.isFinite(x + y + z) && y >= -1 && y <= this.height + 0.2 && this.inside(x, z)
  }

  floorHeight(_position: Vec3) {
    return 0
  }
}
