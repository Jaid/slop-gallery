import type {Wall} from '../placement/wallGeometry.ts'

import slopGallery from '#src/worlds/gallery/index.ts'

import {frescoLayout} from '../gallery/fresco.ts'
import FrescoWallMaterial from './FrescoWallMaterial.ts'

/** The frescoed walls of a room. The bands and panels are laid out around each wall’s own openings, and along round walls, so every wall gets a material of its own; all are created once and disposed together. */
export default class FrescoMaterials {
  readonly walls: ReadonlyMap<string, FrescoWallMaterial>

  constructor(room: Wall['room']) {
    this.walls = new Map(slopGallery.walls.filter(wall => wall.room === room).map(wall => [wall.id, new FrescoWallMaterial({
      ...frescoLayout(wall),
      curveRadius: wall.curveRadius,
    })]))
  }

  dispose() {
    for (const material of this.walls.values()) {
      material.dispose()
    }
  }

  /** the material of a wall’s painted face, or nothing for walls outside the room */
  surface(wall: Wall) {
    return this.walls.get(wall.id)
  }
}
