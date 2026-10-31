import type {Vec3} from './types.ts'

import {knotLayout} from 'knot-materials/exhibition.ts'

export const knotGalleryBounds = knotLayout.bounds
export const knotGallerySize = knotLayout.size
export const knotGalleryCenter = knotLayout.center
/** edge length of the floor’s marble tiles: an eighth of the row spacing, which the room’s depth is always a multiple of */
export const knotFloorTile = knotLayout.rowSpacing / 8
/** a corner of the floor’s tile grid: whole tiles run from the north wall to the south wall, and across the room the grid is centered, so both side walls cut their tiles alike */
export const knotFloorOrigin = [knotGalleryCenter[0], knotGalleryBounds.northZ] as const

export function insideKnotGallery([x, y, z]: Vec3) {
  return x > knotGalleryBounds.minX + 0.6 && x < knotGalleryBounds.maxX - 0.6 && z > knotGalleryBounds.northZ + 0.6 && z < knotGalleryBounds.southZ - 0.6 && y >= -0.2 && y < 5
}
