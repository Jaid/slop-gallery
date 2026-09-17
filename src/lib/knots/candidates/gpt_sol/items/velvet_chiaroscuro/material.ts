import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class VelvetChiaroscuroMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('velvet_chiaroscuro', environment)
    this.name = knotData.id
  }
}
