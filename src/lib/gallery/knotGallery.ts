import type {Vec3} from './types.ts'
import type {Wall} from './walls.ts'

import {knotLayout} from '../knots/exhibition.ts'

export const knotGalleryBounds = knotLayout.bounds
export const knotGallerySize = knotLayout.size
export const knotGalleryCenter = knotLayout.center

export const knotGalleryWalls: Array<Wall> = [
  {
    id: 'study-north',
    center: [knotGalleryCenter[0], 0, knotGalleryBounds.northZ],
    rotation: 0,
    width: knotGallerySize[0],
  },
  {
    id: 'study-south',
    center: [knotGalleryCenter[0], 0, knotGalleryBounds.southZ],
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

/** Interaction occlusion follows this level’s walls, never the museum’s interior partitions. */
export function knotGalleryWallDistance(origin: Vec3, direction: Vec3) {
  if (!origin.every(Number.isFinite) || !direction.every(Number.isFinite)) {
    return Infinity
  }
  let nearest = Infinity
  for (const wall of knotGalleryWalls) {
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
