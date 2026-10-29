import type {Wall} from '../gallery/walls.ts'

import {banquetBoiserie, banquetWallPanels} from '../gallery/banquet.ts'
import walls from '../gallery/walls.ts'
import {BoiserieTrimMaterial, BoiserieWallMaterial} from './boiserie/index.ts'

/**
 * The painted, gilded walls of the Banquet. The boiserie is laid out around each wall’s own doorways, so every wall gets its own surface and trim material; all are created once and disposed together.
 */
export default class BanquetMaterials {
  readonly walls: ReadonlyMap<string, {
    surface: BoiserieWallMaterial
    trim: BoiserieTrimMaterial
  }>

  constructor() {
    this.walls = new Map(walls.filter(wall => wall.room === 'banquet').map((wall, index) => {
      const {rails, upper} = banquetWallPanels(wall)
      return [wall.id, {
        surface: new BoiserieWallMaterial({
          moldingDepth: banquetBoiserie.moldingDepth,
          moldingHalfWidth: banquetBoiserie.moldingHalfWidth,
          panels: upper,
          rails,
          seed: index,
        }),
        trim: new BoiserieTrimMaterial({
          baseboardHeight: wall.baseboardHeight,
          holes: wall.holes,
          wallHeight: wall.height,
        }),
      }] as const
    }))
  }

  dispose() {
    for (const {surface, trim} of this.walls.values()) {
      surface.dispose()
      trim.dispose()
    }
  }

  /** the material of a wall’s painted face, or nothing for walls outside the Banquet */
  surface(wall: Wall) {
    return this.walls.get(wall.id)?.surface
  }

  /** the material of a wall’s baseboard, doorway surrounds and cornice, or nothing for walls outside the Banquet */
  trim(wall: Wall) {
    return this.walls.get(wall.id)?.trim
  }
}
