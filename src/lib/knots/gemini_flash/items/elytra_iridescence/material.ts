import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch2Material.ts'
import knotData from './data.ts'

export default class ElytraIridescenceMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('elytra_iridescence', environment)
    this.name = knotData.id
  }
}
