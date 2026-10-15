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
