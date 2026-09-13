import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch3Material.ts'
import knotData from './data.ts'

export default class ChromosphericSpiculeMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('chromospheric_spicule', environment)
    this.name = knotData.id
  }
}
