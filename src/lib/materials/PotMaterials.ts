import {MeshStandardNodeMaterial} from 'three/webgpu'

import CeladonMaterial from './CeladonMaterial.ts'
import PorcelainMaterial from './PorcelainMaterial.ts'
import SoilTextures from './SoilTextures.ts'
import TenmokuMaterial from './TenmokuMaterial.ts'
import TerracottaTextures from './TerracottaTextures.ts'

/** A shared pot finish set; only the detailed variant allocates procedural textures. */
export default class PotMaterials {
  readonly shells
  readonly soil: MeshStandardNodeMaterial
  private readonly clayTextures: TerracottaTextures | null
  private readonly soilTextures: SoilTextures | null

  constructor(noiseTextures: boolean) {
    this.clayTextures = noiseTextures ? new TerracottaTextures : null
    this.soilTextures = noiseTextures ? new SoilTextures : null
    this.shells = {
      atelier: new MeshStandardNodeMaterial(this.clayTextures ? {
        map: this.clayTextures.map,
        bumpMap: this.clayTextures.bumpMap,
        bumpScale: 0.008,
        roughnessMap: this.clayTextures.roughnessMap,
        roughness: 1,
      } : {
        color: '#b47249',
        roughness: 0.87,
      }),
      ivory: new PorcelainMaterial,
      celadon: new CeladonMaterial,
      noir: new TenmokuMaterial,
    }
    this.soil = new MeshStandardNodeMaterial(this.soilTextures ? {
      map: this.soilTextures.map,
      bumpMap: this.soilTextures.bumpMap,
      bumpScale: 0.022,
      roughness: 1,
    } : {
      color: '#362416',
      roughness: 1,
    })
  }

  dispose() {
    for (const material of [...Object.values(this.shells), this.soil]) {
      material.dispose()
    }
    this.clayTextures?.dispose()
    this.soilTextures?.dispose()
  }
}
