import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch2Material.ts'
import knotData from './data.ts'

export default class FableBatch2Material extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('abyssal_chromatophore', environment)
    this.name = knotData.id
  }
}
