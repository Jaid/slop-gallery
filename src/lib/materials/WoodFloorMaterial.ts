import type {Texture} from 'three/webgpu'

import {ReflectiveFloorMaterial} from './ReflectiveFloorMaterial.ts'

/** A light satin varnish, not the marble floor’s mirror-like polish. */
export class WoodFloorMaterial extends ReflectiveFloorMaterial {
  constructor(map: Texture) {
    super(map, {color: '#c5a585', roughness: 0.28, strength: 0.035, grazingStrength: 0.2, blur: 2.5})
  }
}
