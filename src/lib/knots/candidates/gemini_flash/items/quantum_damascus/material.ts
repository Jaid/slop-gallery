import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch2Material.ts'
import knotData from './data.ts'

export default class QuantumDamascusMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('quantum_damascus', environment)
    this.name = knotData.id
  }
}
