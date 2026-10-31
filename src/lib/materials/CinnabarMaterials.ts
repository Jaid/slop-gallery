import type {Wall} from '../placement/wallGeometry.ts'

import slopGallery from '#src/worlds/gallery/index.ts'

import {frescoLayout} from '../gallery/cinnabar.ts'
import CinnabarWallMaterial from './CinnabarWallMaterial.ts'

/** The frescoed walls of the Cinnabar. The bands and panels are laid out around each wall’s own doorways, so every wall gets a material of its own; all are created once and disposed together. */
export default class CinnabarMaterials {
  readonly walls: ReadonlyMap<string, CinnabarWallMaterial>

  constructor() {
    this.walls = new Map(slopGallery.walls.filter(wall => wall.room === 'cinnabar').map(wall => [wall.id, new CinnabarWallMaterial(frescoLayout(wall))]))
  }

  dispose() {
    for (const material of this.walls.values()) {
      material.dispose()
    }
  }

  /** the material of a wall’s painted face, or nothing for walls outside the Cinnabar */
  surface(wall: Wall) {
    return this.walls.get(wall.id)
  }
}
