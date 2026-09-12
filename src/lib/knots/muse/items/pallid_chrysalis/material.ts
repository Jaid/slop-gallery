import type {Texture} from 'three/webgpu'

import {KnotMaterial} from '../../webChatMaterial.ts'

export default class WebChatKnotMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super('pallid_chrysalis', environment)
  }
}
