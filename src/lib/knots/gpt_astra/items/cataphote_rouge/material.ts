import type {Texture} from 'three/webgpu'

import {KnotMaterial as AstraAdditionalMaterial} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class CataphoteRougeMaterial extends AstraAdditionalMaterial {
  constructor(environment: Texture) {
    super('cataphote_rouge', environment)
    this.name = knotData.id
  }
}
