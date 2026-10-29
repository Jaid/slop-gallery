import type {Vec3} from '../gallery/types.ts'
import type {PlacementObstruction} from './base/PlacementSpace.ts'
import type {Wall} from './wallGeometry.ts'

import {lodgeWindowGlassDistance} from '../gallery/lodge.ts'
import {salonWindowGlassDistance} from '../gallery/salonWindow.ts'
import {PlacementSpace} from './base/PlacementSpace.ts'

/**
 * The museum’s rooms, stairs and passages.
 *
 * The gallery world constructs it with its walls, floors and volume, which it cannot import itself without a cycle.
 */
export class GalleryPlacementSpace extends PlacementSpace {
  readonly recoveryPosition: Vec3 = [0, 1, 4]

  constructor(readonly walls: ReadonlyArray<Wall>, private readonly navigation: {
    contains: (position: Vec3) => boolean
    floorHeight: (position: Vec3) => number
  }) {
    super()
  }

  contains(position: Vec3) {
    return this.navigation.contains(position)
  }

  floorHeight(position: Vec3) {
    return this.navigation.floorHeight(position)
  }

  /** The glass of the Lodge window and of the window between the Lobby and the Salon stops the aim before the walls behind it. */
  protected override obstruction(origin: Vec3, direction: Vec3): PlacementObstruction | null {
    const panes = [
      {
        distance: lodgeWindowGlassDistance(origin, direction),
        wallId: 'lodge-west',
      },
      {
        distance: salonWindowGlassDistance(origin, direction),
        wallId: direction[0] < 0 ? 'salon-west' : 'lobby-extension_east',
      },
    ]
    const pane = panes.filter(candidate => candidate.distance !== undefined).toSorted((a, b) => a.distance! - b.distance!).at(0)
    if (!pane) {
      return null
    }
    const distance = pane.distance!
    return {
      distance,
      placement: {
        inReach: distance * Math.hypot(...direction) <= this.reach,
        position: [origin[0] + direction[0] * distance, origin[1] + direction[1] * distance, origin[2] + direction[2] * distance],
        rotation: direction[0] < 0 ? Math.PI / 2 : -Math.PI / 2,
        wallId: pane.wallId,
        valid: false,
        reason: 'Keep the window clear.',
      },
    }
  }

  /**
   * Anything that does not fit the museum is a damaged or forged collection, which validation rejects instead of silently rearranging it.
   */
  override settle(portraits: ReadonlyArray<unknown>) {
    return portraits
  }
}
