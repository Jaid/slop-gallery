import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class GlacialCipherMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('glacial_cipher', environment)
    this.name = knotData.id
  }
}
