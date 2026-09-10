import type {Vec3} from './types.ts'
import type {Wall} from './walls.ts'

import {knotBays, knotPreviewX} from '../knots/exhibition.ts'

const halfWidth = Math.max(28, -knotPreviewX + 5)

// Permanent Knot Gallery geometry, independent of the museum.
export const knotGalleryBounds = {
  minX: -halfWidth,
  maxX: halfWidth,
  northZ: Math.min(-64, ...knotBays.map(bay => bay.center[2] - 5.5)),
  southZ: 10,
  height: 5.8,
} as const
export const knotGallerySize: Vec3 = [knotGalleryBounds.maxX - knotGalleryBounds.minX, knotGalleryBounds.height, knotGalleryBounds.southZ - knotGalleryBounds.northZ]
export const knotGalleryCenter: Vec3 = [0, 0, (knotGalleryBounds.northZ + knotGalleryBounds.southZ) / 2]

export const knotGalleryWalls: Array<Wall> = [
  {
    id: 'study-north',
    center: [0, 0, knotGalleryBounds.northZ],
    rotation: 0,
    width: knotGallerySize[0],
  },
  {
    id: 'study-south',
    center: [0, 0, knotGalleryBounds.southZ],
    rotation: Math.PI,
    width: knotGallerySize[0],
  },
  {
    id: 'study-west',
    center: [knotGalleryBounds.minX, 0, knotGalleryCenter[2]],
    rotation: Math.PI / 2,
    width: knotGallerySize[2],
  },
  {
    id: 'study-east',
    center: [knotGalleryBounds.maxX, 0, knotGalleryCenter[2]],
    rotation: -Math.PI / 2,
    width: knotGallerySize[2],
  },
].map(wall => ({
  ...wall,
  center: wall.center as Vec3,
  room: 'lobby',
  height: knotGalleryBounds.height,
  hangable: false,
}))

export function insideKnotGallery([x, y, z]: Vec3) {
  return x > knotGalleryBounds.minX + 0.6 && x < knotGalleryBounds.maxX - 0.6 && z > knotGalleryBounds.northZ + 0.6 && z < knotGalleryBounds.southZ - 0.6 && y >= -0.2 && y < 5
}
