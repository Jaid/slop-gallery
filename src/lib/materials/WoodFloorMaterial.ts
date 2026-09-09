import type {Texture} from 'three/webgpu'

import {FloorMaterial} from './FloorMaterial.ts'

/** Satin-varnished wood in quality; matte wood in performance. */
export class WoodFloorMaterial extends FloorMaterial {
  constructor(map: Texture, reflections = true) {
    super(map, {
      color: '#c5a585',
      roughness: reflections ? 0.28 : 0.72,
      reflection: reflections ? {
        strength: 0.035,
        grazingStrength: 0.2,
        blur: 2.5,
      } : undefined,
    })
  }
}
