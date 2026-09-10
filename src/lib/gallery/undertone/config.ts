import {lowerGallery} from '../lowerGallery.ts'

export const undertoneCrater = {
  radius: 9,
  depth: 3.6,
  fenceRadius: 10,
  fencePosts: 32,
  radialSegments: 96,
  angularSegments: 256,
} as const

export const undertoneRecovery = [lowerGallery.undertone.center[0] + 11.5, lowerGallery.floorY + 0.2, lowerGallery.undertone.center[1] + 11.5] as const
