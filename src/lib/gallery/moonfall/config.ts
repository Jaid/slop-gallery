import lowerGallery from '../lowerGallery.ts'

export const moonfallCrater = {
  radius: 9,
  depth: 3.6,
  fenceRadius: 10,
  fencePosts: 32,
  /** vertices on the cut edge, shared by the terrain, the floor’s hole and the bronze trim */
  rimSegments: 128,
  /** largest vertical deviation of the low-poly terrain from its height field at any sample */
  terrainTolerance: 0.08,
  /** spacing of the height field samples that may become terrain vertices */
  terrainSpacing: 0.07,
} as const

export const moonfallRecovery = [lowerGallery.moonfall.center[0] + 11.5, lowerGallery.floorY + 0.2, lowerGallery.moonfall.center[1] + 11.5] as const
