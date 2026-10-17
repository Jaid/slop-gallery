import {knotGalleryBounds, knotGalleryWalls} from '#src/lib/gallery/knotGallery.ts'
import {HallPlacementSpace} from '#src/lib/placement/HallPlacementSpace.ts'

import {playerSpawn} from './navigation.ts'

/** Artworks hang on any of the hall’s four walls, which nothing else occupies, and lost ones return to the spawn. */
const knotPlacement = new HallPlacementSpace(knotGalleryWalls, knotGalleryBounds, [playerSpawn.position[0], 1, playerSpawn.position[2]])

export default knotPlacement
