import type {Texture} from 'three/webgpu'

import FloorMaterial from './FloorMaterial.ts'

/** Satin-varnished wood in heavy mode; matte wood in fast mode. */
export default class WoodFloorMaterial extends FloorMaterial {
  constructor(map: Texture, reflections = true) {
    super(map, {
      color: '#c5a585',
      roughness: reflections ? 0.28 : 0.72,
      reflection: reflections ? {
        strength: 0.5,
        grazingStrength: 0.1,
        blur: 4,
      } : undefined,
    })
  }
}
