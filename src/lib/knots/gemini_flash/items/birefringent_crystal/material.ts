import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch2Material.ts'
import knotData from './data.ts'

export default class BirefringentCrystalMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('birefringent_crystal', environment)
    this.name = knotData.id
  }
}
