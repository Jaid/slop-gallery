import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch3Material.ts'
import knotData from './data.ts'

export default class PhotonicMorphoMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('photonic_morpho', environment)
    this.name = knotData.id
  }
}
