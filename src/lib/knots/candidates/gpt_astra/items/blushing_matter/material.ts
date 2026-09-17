import type {Texture} from 'three/webgpu'

import {KnotMaterial as AstraAdditionalMaterial} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class BlushingMatterMaterial extends AstraAdditionalMaterial {
  constructor(environment: Texture) {
    super('blushing_matter', environment)
    this.name = knotData.id
  }
}
