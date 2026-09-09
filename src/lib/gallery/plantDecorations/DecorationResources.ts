import type {DestructibleGeometry} from '../destructiblePlants/base/DestructibleGeometry.ts'
import type {DestructiblePlantKind} from '../destructiblePlants/catalog.ts'
import type {DestructibleCatalogKind} from '../destructiblePlants/CatalogPlantGeometry.ts'
import type {PlantKind, PotKind} from './catalog.ts'

import {DoubleSide, MeshStandardNodeMaterial} from 'three/webgpu'

import {SoilTextures} from '#src/lib/materials/SoilTextures.ts'
import {TerracottaTextures} from '#src/lib/materials/TerracottaTextures.ts'

import {CatalogPlantGeometry} from '../destructiblePlants/CatalogPlantGeometry.ts'
import {DestructiblePlantGeometry} from '../destructiblePlants/DestructiblePlantGeometry.ts'
import {PlantGeometry} from './PlantGeometry.ts'
import {PotGeometry} from './PotGeometry.ts'

/** Module-owned shared assets; preview unmounts never dispose another decoration’s meshes. */
class DecorationResources {
  readonly brass = new MeshStandardNodeMaterial({
    color: '#b59a5f',
    metalness: 0.82,
    roughness: 0.28,
  })
  readonly foliage = new MeshStandardNodeMaterial({
    vertexColors: true,
    side: DoubleSide,
    roughness: 0.52,
  })
  private readonly clayTextures = new TerracottaTextures
  readonly shells = {
    atelier: new MeshStandardNodeMaterial({
      map: this.clayTextures.map,
      bumpMap: this.clayTextures.bumpMap,
      bumpScale: 0.008,
      roughnessMap: this.clayTextures.roughnessMap,
      roughness: 1,
    }),
    ivory: new MeshStandardNodeMaterial({
      color: '#e5dfcd',
      roughness: 0.43,
    }),
    celadon: new MeshStandardNodeMaterial({
      color: '#73978b',
      roughness: 0.23,
      metalness: 0.06,
    }),
    noir: new MeshStandardNodeMaterial({
      color: '#303735',
      roughness: 0.56,
      metalness: 0.12,
    }),
  }
  private readonly soilTextures = new SoilTextures
  readonly soil = new MeshStandardNodeMaterial({
    map: this.soilTextures.map,
    bumpMap: this.soilTextures.bumpMap,
    bumpScale: 0.022,
    roughness: 1,
  })
  readonly stems = new MeshStandardNodeMaterial({
    color: '#4e6539',
    roughness: 0.8,
  })
  readonly waxyFoliage = new MeshStandardNodeMaterial({
    vertexColors: true,
    side: DoubleSide,
    roughness: 0.3,
  })
  readonly wood = new MeshStandardNodeMaterial({
    color: '#78614a',
    roughness: 0.92,
  })
  private readonly destructibleCache = new Map<DestructibleCatalogKind | DestructiblePlantKind, DestructibleGeometry>
  private readonly plantCache = new Map<PlantKind, PlantGeometry>
  private readonly potCache = new Map<PotKind, PotGeometry>

  destructiblePlant(kind: DestructibleCatalogKind | DestructiblePlantKind) {
    let geometry = this.destructibleCache.get(kind)
    if (!geometry) {
      geometry = kind === 'snake' || kind === 'calathea' ? new CatalogPlantGeometry(kind) : new DestructiblePlantGeometry(kind)
      this.destructibleCache.set(kind, geometry)
    }
    return geometry
  }

  dispose() {
    for (const geometry of [...this.potCache.values(), ...this.plantCache.values(), ...this.destructibleCache.values()]) {
      geometry.dispose()
    }
    for (const material of [...Object.values(this.shells), this.soil, this.brass, this.foliage, this.waxyFoliage, this.stems, this.wood]) {
      material.dispose()
    }
    this.soilTextures.dispose()
    this.clayTextures.dispose()
  }

  plant(kind: PlantKind) {
    let geometry = this.plantCache.get(kind)
    if (!geometry) {
      geometry = new PlantGeometry(kind)
      this.plantCache.set(kind, geometry)
    }
    return geometry
  }

  pot(kind: PotKind) {
    let geometry = this.potCache.get(kind)
    if (!geometry) {
      geometry = new PotGeometry(kind)
      this.potCache.set(kind, geometry)
    }
    return geometry
  }
}
let shared: DecorationResources | undefined
export function decorationResources() {
  shared ??= new DecorationResources
  return shared
}

if ('hot' in import.meta) {
  import.meta.hot.dispose(() => shared?.dispose())
}
