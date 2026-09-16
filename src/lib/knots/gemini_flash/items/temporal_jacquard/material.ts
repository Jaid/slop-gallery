import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch3Material.ts'
import knotData from './data.ts'

export default class TemporalJacquardMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('temporal_jacquard', environment)
    this.name = knotData.id
  }
}
