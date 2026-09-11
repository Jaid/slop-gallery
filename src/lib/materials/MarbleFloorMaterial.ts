import type {Texture} from 'three/webgpu'

import {texture} from 'three/tsl'

import FloorMaterial from './FloorMaterial.ts'

/** Polished, reflective marble in quality; honed stone in performance. */
export default class MarbleFloorMaterial extends FloorMaterial {
  constructor(map: Texture, reflections = true) {
    super(map, {
      color: '#e8dfd0',
      roughness: reflections ? 0.12 : 0.8,
      // Keep grout matte; even dark marble is lighter than grout in linear color.
      reflection: reflections ? {
        strength: 0.12,
        grazingStrength: 0.65,
        blur: 1,
        mask: texture(map).r.smoothstep(0.008, 0.014),
      } : undefined,
    })
  }
}
