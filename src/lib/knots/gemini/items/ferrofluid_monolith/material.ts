import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch3Material.ts'
import knotData from './data.ts'

export default class FerrofluidMonolithMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('ferrofluid_monolith', environment)
    this.name = knotData.id
  }
}
