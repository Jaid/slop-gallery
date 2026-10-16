import type {PlankOptions} from './PlankMaterial.ts'

import {Material, MeshStandardNodeMaterial, NodeMaterial} from 'three/webgpu'

import lodge, {lodgeFloorPlanks} from '../gallery/lodge.ts'
import lodgeInterior from '../gallery/lodgeInterior/layout.ts'
import FieldstoneMaterial from './FieldstoneMaterial.ts'
import FirewoodMaterial from './FirewoodMaterial.ts'
import {lightIndoors} from './IndoorLightsNode.ts'
import LeatherMaterial from './LeatherMaterial.ts'
import LodgeTimberMaterial from './LodgeTimberMaterial.ts'
import LogWallMaterial from './LogWallMaterial.ts'
import PlankMaterial from './PlankMaterial.ts'
import RugMaterial from './RugMaterial.ts'
import WroughtIronMaterial from './WroughtIronMaterial.ts'

/** Narrow tongue-and-groove boards between the beams, darkened by decades of wood smoke. */
const ceilingPlanks: PlankOptions = {
  axis: 'z',
  width: 0.14,
  length: [2.4, 4.2],
  knots: 0.25,
  bevel: 0.006,
  seam: 0.004,
  seed: 11,
  roughness: 0.8,
  envMapIntensity: 0.1,
  colors: {
    dark: '#3d281a',
    light: '#6a4a2f',
    ring: '#2a190e',
    seam: '#120a05',
  },
}
const bookMaterial = ({color}: {color: string}) => new MeshStandardNodeMaterial({
  color,
  roughness: 0.85,
})

/** Every surface of the Lodge interior, created once and disposed together. */
export default class LodgeMaterials {
  /** cloth-bound books on the coffee table */
  readonly books = lodgeInterior.books.map(bookMaterial)
  readonly ceiling = new PlankMaterial(ceilingPlanks)
  readonly firewood = new FirewoodMaterial(lodgeInterior.firewood.radius)
  readonly flame = new MeshStandardNodeMaterial({
    color: '#fff0b6',
    emissive: '#ffc96a',
    emissiveIntensity: 4,
    toneMapped: false,
  })
  readonly floor = new PlankMaterial(lodgeFloorPlanks)
  readonly iron = new WroughtIronMaterial
  readonly leather = new LeatherMaterial
  readonly logWall = new LogWallMaterial({floorY: lodge.floorY})
  readonly rug = new RugMaterial(lodgeInterior.rug.size)
  /** the firebox’s soot-blackened stone lining */
  readonly soot = new FieldstoneMaterial({brightness: 0.22})
  /** smoke has darkened the stone above the firebox opening */
  readonly stone = new FieldstoneMaterial({soot: [lodge.center[0], lodge.floorY + lodgeInterior.fireplace.opening, lodge.center[1] + lodgeInterior.fireplace.front]})
  readonly timber = new LodgeTimberMaterial

  readonly wax = new MeshStandardNodeMaterial({
    color: '#eadcbc',
    roughness: 0.55,
    emissive: '#ffb066',
    emissiveIntensity: 0.15,
  })

  constructor() {
    // The Lodge is underground: only its own fire, candles and lamps light it, not the gallery’s sun.
    for (const material of this.all()) {
      if (material instanceof NodeMaterial) {
        lightIndoors(material)
      }
    }
  }

  dispose() {
    for (const material of this.all()) {
      material.dispose()
    }
  }

  private all() {
    return Object.values(this).flat().filter(value => value instanceof Material)
  }
}
