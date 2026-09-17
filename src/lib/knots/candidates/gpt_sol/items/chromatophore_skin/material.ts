import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class ChromatophoreSkinMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('chromatophore_skin', environment)
    this.name = knotData.id
  }
}
