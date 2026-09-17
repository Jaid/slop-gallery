import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../webChatMaterial.ts'

export default class WebChatKnotMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('quantum_circuit', environment)
  }
}
