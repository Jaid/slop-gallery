import {MeshStandardNodeMaterial} from 'three/webgpu'

import {SoilTextures} from './SoilTextures.ts'
import {TerracottaTextures} from './TerracottaTextures.ts'

/** A shared pot finish set; only the detailed variant allocates procedural textures. */
export class PotMaterials {
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
