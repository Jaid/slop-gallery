import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch3Material.ts'
import knotData from './data.ts'

export default class CryogenicKintsugiMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('cryogenic_kintsugi', environment)
    this.name = knotData.id
  }
}
