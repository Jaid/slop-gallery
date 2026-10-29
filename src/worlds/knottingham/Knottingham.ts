import type {Artwork, Vec3} from '#src/lib/gallery/types.ts'
import type {KnotDump} from '#src/lib/webmcp/tools.ts'

import {knotExhibition, knotFloatHeight, knotLayout} from 'knot-materials/exhibition.ts'
import {lazy} from 'react'

import {insideKnotGallery, knotGalleryBounds, knotGalleryWallDistance} from '#src/lib/gallery/knotGallery.ts'
import {HallPlacementSpace} from '#src/lib/placement/HallPlacementSpace.ts'
import Arena from '#src/rooms/arena/Arena.ts'

import World from '../base/World.ts'
import {worlds} from '../index.ts'
import {knotRarityEditor} from './rarity.ts'

const minimap = lazy(() => import('#component/KnottinghamMinimap'))
const scene = lazy(() => import('#src/rooms/arena/components/ArenaRoom/index.tsx'))

/** The Knot materials’ exhibition: one hall, the Arena, with a row per candidate. Its size follows the Knots the URL selects. */
export default class Knottingham extends World<Arena> {
  // Knottingham darkens contacts more tightly.
  override readonly ambientOcclusionThickness = 0.6
  override readonly artworks: ReadonlyArray<Artwork> = []
  override readonly defaultRoom = 'arena'
  override readonly id = 'knottingham'
  override readonly Minimap = minimap
  // Artworks hang on any of the hall’s four walls, which nothing else occupies, and lost ones return to the spawn.
  override readonly placement: HallPlacementSpace
  override readonly Scene = scene

  constructor() {
    super(worlds.knottingham, [[new Arena(knotLayout), knotLayout.center]])
    const [x, , z] = this.spawn.position
    this.placement = new HallPlacementSpace(this.walls, knotGalleryBounds, [x, 1, z])
  }

  override contains(position: Vec3) {
    return insideKnotGallery(position)
  }

  /** Every exhibited Knot with its live session rarity, including unsaved `?rarity=edit` changes. */
  override dumpKnots(): ReadonlyArray<KnotDump> {
    const ratings = knotRarityEditor.getSnapshot()
    return knotExhibition.map(exhibit => ({
      id: exhibit.id,
      name: exhibit.title,
      position: [exhibit.position[0], knotFloatHeight, exhibit.position[2]],
      rarity: ratings.get(exhibit.id)!,
    }))
  }

  /** The hall’s floor is level everywhere. */
  override floorHeight(_position: Vec3) {
    return 0
  }

  override wallDistance(origin: Vec3, direction: Vec3) {
    return knotGalleryWallDistance(this.walls, origin, direction)
  }
}
