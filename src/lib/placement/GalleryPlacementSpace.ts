import type {Vec3} from '../gallery/types.ts'
import type {PlacementObstruction} from './base/PlacementSpace.ts'
import type {Wall} from './wallGeometry.ts'

import {lodgeWindowGlassDistance} from '../gallery/lodge.ts'
import {PlacementSpace} from './base/PlacementSpace.ts'

/**
 * The museum’s rooms, stairs and passages.
 *
 * The museum’s data module constructs it with its walls, floors and volume, which it cannot import itself without a cycle.
 */
export class GalleryPlacementSpace extends PlacementSpace {
  readonly recoveryPosition: Vec3 = [0, 1, 4]

  constructor(readonly walls: ReadonlyArray<Wall>, private readonly level: {
    contains: (position: Vec3) => boolean
    floorHeight: (position: Vec3) => number
  }) {
    super()
  }

  contains(position: Vec3) {
    return this.level.contains(position)
  }

  floorHeight(position: Vec3) {
    return this.level.floorHeight(position)
  }

  /** The Lodge window’s glass stops the aim before the tunnel walls behind it. */
  protected override obstruction(origin: Vec3, direction: Vec3): PlacementObstruction | null {
    const distance = lodgeWindowGlassDistance(origin, direction)
    if (distance === undefined) {
      return null
    }
    return {
      distance,
      placement: {
        inReach: distance * Math.hypot(...direction) <= this.reach,
        position: [origin[0] + direction[0] * distance, origin[1] + direction[1] * distance, origin[2] + direction[2] * distance],
        rotation: direction[0] < 0 ? Math.PI / 2 : -Math.PI / 2,
        wallId: 'lodge-west',
        valid: false,
        reason: 'Keep the window clear.',
      },
    }
  }

  /**
   * The museum’s layout only changes with exhibition updates, which move affected works explicitly. Anything else that does not fit is a damaged or forged collection, which validation rejects instead of silently rearranging it.
   */
  override settle(portraits: ReadonlyArray<unknown>) {
    return portraits
  }
}
