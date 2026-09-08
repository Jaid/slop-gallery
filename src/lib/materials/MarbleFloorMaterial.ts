import type {Texture} from 'three/webgpu'
import {texture} from 'three/tsl'

import {ReflectiveFloorMaterial} from './ReflectiveFloorMaterial.ts'

/** Polished stone with a live planar reflection, stronger at grazing angles. */
export class MarbleFloorMaterial extends ReflectiveFloorMaterial {
  constructor(map: Texture) {
    // Keep grout matte; even the dark marble is lighter than the grout in linear color.
    super(map, {color: '#e8dfd0', roughness: 0.12, strength: 0.12, grazingStrength: 0.65, blur: 1, mask: texture(map).r.smoothstep(0.008, 0.014)})
  }
}
