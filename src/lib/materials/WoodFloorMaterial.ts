import type {Texture} from 'three/webgpu'

import FloorMaterial from './FloorMaterial.ts'

/** Satin-varnished wood in heavy mode; matte wood in fast mode. */
export default class WoodFloorMaterial extends FloorMaterial {
  constructor(map: Texture, reflections = true) {
    super(map, {
      color: '#c5a585',
      roughness: reflections ? 0.2 : 0.72,
      reflection: reflections ? {
        strength: 0.3,
        grazingStrength: 0,
        gaussianBlur: 16,
        loss: 0,
      } : undefined,
    })
  }
}
