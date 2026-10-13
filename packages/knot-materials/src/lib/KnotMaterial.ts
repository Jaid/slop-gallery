import type {Texture} from 'three/webgpu'

import {MeshPhysicalNodeMaterial} from 'three/webgpu'

export default abstract class KnotMaterial extends MeshPhysicalNodeMaterial {
  /** Optional opaque interior, owned by this material and rendered beneath its shell on the same topology. */
  coreMaterial?: MeshPhysicalNodeMaterial

  constructor(environment: Texture, envMapIntensity = 0.9) {
    super({
      envMap: environment,
      envMapIntensity,
    })
  }

  override dispose() {
    this.coreMaterial?.dispose()
    super.dispose()
  }
}
