import type {Texture} from 'three/webgpu'

import {KnotMaterial as AstraAdditionalMaterial} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class FerrothornMaterial extends AstraAdditionalMaterial {
  constructor(environment: Texture) {
    super('ferrothorn', environment)
    this.name = knotData.id
  }
}
