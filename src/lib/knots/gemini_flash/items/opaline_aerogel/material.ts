import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch3Material.ts'
import knotData from './data.ts'

export default class OpalineAerogelMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('opaline_aerogel', environment)
    this.name = knotData.id
  }
}
