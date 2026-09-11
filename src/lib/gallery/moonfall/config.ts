import lowerGallery from '../lowerGallery.ts'

export const moonfallCrater = {
  radius: 9,
  depth: 3.6,
  fenceRadius: 10,
  fencePosts: 32,
  radialSegments: 96,
  angularSegments: 256,
} as const

export const moonfallRecovery = [lowerGallery.moonfall.center[0] + 11.5, lowerGallery.floorY + 0.2, lowerGallery.moonfall.center[1] + 11.5] as const
