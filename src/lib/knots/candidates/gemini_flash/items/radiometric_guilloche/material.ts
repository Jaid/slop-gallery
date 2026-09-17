import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch3Material.ts'
import knotData from './data.ts'

export default class RadiometricGuillocheMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('radiometric_guilloche', environment)
    this.name = knotData.id
  }
}
