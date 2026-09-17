import type {Texture} from 'three/webgpu'

import {GrokBuildMaterial} from '../../buildMaterial.ts'

export default class GrokBuildKnotMaterial extends GrokBuildMaterial {
  constructor(environment: Texture) {
    super('ferrofluid_oracle', environment)
  }
}
