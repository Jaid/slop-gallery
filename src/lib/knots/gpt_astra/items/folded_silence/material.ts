import type {Texture} from 'three/webgpu'

import {KnotMaterial as AstraAdditionalMaterial} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class FoldedSilenceMaterial extends AstraAdditionalMaterial {
  constructor(environment: Texture) {
    super('folded_silence', environment)
    this.name = knotData.id
  }
}
