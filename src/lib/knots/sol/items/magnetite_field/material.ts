import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class MagnetiteFieldMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('magnetite_field', environment)
    this.name = knotData.id
  }
}
