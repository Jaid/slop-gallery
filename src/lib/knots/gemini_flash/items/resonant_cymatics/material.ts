import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch3Material.ts'
import knotData from './data.ts'

export default class ResonantCymaticsMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('resonant_cymatics', environment)
    this.name = knotData.id
  }
}
