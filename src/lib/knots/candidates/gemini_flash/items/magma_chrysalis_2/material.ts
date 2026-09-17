import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch2Material.ts'
import knotData from './data.ts'

export default class MagmaChrysalis2Material extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('magma_chrysalis', environment)
    this.name = knotData.id
  }
}
