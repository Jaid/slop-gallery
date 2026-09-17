import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class WeepingBasaltMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('weeping_basalt', environment)
    this.name = knotData.id
  }
}
