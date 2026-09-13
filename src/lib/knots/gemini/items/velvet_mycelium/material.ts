import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch2Material.ts'
import knotData from './data.ts'

export default class VelvetMyceliumMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('velvet_mycelium', environment)
    this.name = knotData.id
  }
}
