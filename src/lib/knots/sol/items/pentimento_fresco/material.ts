import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class PentimentoFrescoMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('pentimento_fresco', environment)
    this.name = knotData.id
  }
}
