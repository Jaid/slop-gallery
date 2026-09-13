import type {Texture} from 'three/webgpu'

import {KnotMaterial as AstraAdditionalMaterial} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class ChladniSandsMaterial extends AstraAdditionalMaterial {
  constructor(environment: Texture) {
    super('chladni_sands', environment)
    this.name = knotData.id
  }
}
