import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class CapturedTempestMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('captured_tempest', environment)
    this.name = knotData.id
  }
}
