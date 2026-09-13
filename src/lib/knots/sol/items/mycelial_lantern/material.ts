import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class MycelialLanternMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('mycelial_lantern', environment)
    this.name = knotData.id
  }
}
