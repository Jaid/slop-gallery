import type {Texture} from 'three/webgpu'

import {MeshPhysicalNodeMaterial} from 'three/webgpu'

export abstract class KnotMaterial extends MeshPhysicalNodeMaterial {
  constructor(environment: Texture, envMapIntensity = 0.9) {
    super({
      envMap: environment,
      envMapIntensity,
    })
  }
}
