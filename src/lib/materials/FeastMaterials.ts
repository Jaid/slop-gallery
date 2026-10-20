import {MeshStandardNodeMaterial} from 'three/webgpu'

import BanquetTextileMaterial from './BanquetTextileMaterial.ts'
import PolishedBrassMaterial from './PolishedBrassMaterial.ts'
import WalnutMaterial from './WalnutMaterial.ts'

/** Locally owned materials shared by every part of the Dine banquet, in either graphics mode. */
export default class FeastMaterials {
  readonly brass = new PolishedBrassMaterial
  readonly flame = new MeshStandardNodeMaterial({
    color: '#fff2c4',
    emissive: '#ffc36b',
    emissiveIntensity: 3,
    roughness: 1,
  })
  readonly linen = new BanquetTextileMaterial('#efe3c9')
  readonly porcelain = new MeshStandardNodeMaterial({
    color: '#fff4de',
    roughness: 0.19,
    metalness: 0,
    envMapIntensity: 0.8,
  })
  readonly velvet = new BanquetTextileMaterial('#253f5a', true)
  readonly wax = new MeshStandardNodeMaterial({
    color: '#f9e4b6',
    roughness: 0.7,
  })
  readonly wood = new WalnutMaterial

  dispose() {
    for (const material of [this.wood, this.brass, this.porcelain, this.linen, this.velvet, this.wax, this.flame]) {
      material.dispose()
    }
  }
}
