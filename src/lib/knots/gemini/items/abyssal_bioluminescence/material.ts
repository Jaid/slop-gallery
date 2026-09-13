import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch2Material.ts'
import knotData from './data.ts'

export default class AbyssalBioluminescenceMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('abyssal_bioluminescence', environment)
    this.name = knotData.id
  }
}
