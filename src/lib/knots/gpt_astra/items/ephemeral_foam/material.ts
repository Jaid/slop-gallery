import type {Texture} from 'three/webgpu'

import {KnotMaterial as AstraAdditionalMaterial} from '../../additionalBatchMaterial.ts'
import knotData from './data.ts'

export default class EphemeralFoamMaterial extends AstraAdditionalMaterial {
  constructor(environment: Texture) {
    super('ephemeral_foam', environment)
    this.name = knotData.id
  }
}
