import type {Vec3} from '../gallery/types.ts'
import type {Wall} from './wallGeometry.ts'

import {PlacementSpace} from './base/PlacementSpace.ts'

/**
 * A sealed space under a floor plan of any shape, its floor around y = 0, like the Sandbox’s Cell with its round vestibule.
 */
export class FloorPlanPlacementSpace extends PlacementSpace {
  readonly recoveryPosition: Vec3

  /**
   * @param inside whether a point on the floor plan, in world x and z, lies within it
   * @param height how high the ceiling hangs over y = 0
   * @param floor how high the floor lies under a position, level at y = 0 by default
   */
  constructor(readonly walls: ReadonlyArray<Wall>, private readonly inside: (x: number, z: number) => boolean, readonly height: number, recoveryPosition: Vec3, private readonly floor: (position: Vec3) => number = () => 0) {
    super()
    if (!this.contains(recoveryPosition)) {
      throw new RangeError('Artworks have to recover inside the floor plan.')
    }
    this.recoveryPosition = [...recoveryPosition]
  }

  /** Anywhere over the floor plan between floor and ceiling, with a little slack for bodies resting against them. */
  contains(position: Vec3) {
    const [x, y, z] = position
    return Number.isFinite(x + y + z) && y >= this.floor(position) - 1 && y <= this.height + 0.2 && this.inside(x, z)
  }

  floorHeight(position: Vec3) {
    return this.floor(position)
  }
}
