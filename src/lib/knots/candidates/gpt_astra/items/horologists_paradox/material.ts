import type {Texture} from 'three/webgpu'

import {KnotMaterial as AstraAdditionalMaterial} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class HorologistsParadoxMaterial extends AstraAdditionalMaterial {
  constructor(environment: Texture) {
    super('horologists_paradox', environment)
    this.name = knotData.id
  }
}
