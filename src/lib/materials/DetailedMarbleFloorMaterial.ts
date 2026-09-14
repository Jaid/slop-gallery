import type {Texture} from 'three/webgpu'

import {float, mix, mx_noise_float, positionWorld, texture, vec3} from 'three/tsl'

import FloorMaterial from './FloorMaterial.ts'

/** Polished marble with broad/fine roughness breakup and matching reflection blur. */
export default class DetailedMarbleFloorMaterial extends FloorMaterial {
  constructor(map: Texture, reflections = true) {
    const stone = texture(map).r.smoothstep(0.008, 0.014)
    const broad = mx_noise_float(positionWorld.mul(vec3(0.28, 0, 0.28)))
    const fine = mx_noise_float(positionWorld.mul(vec3(5.2, 0, 5.2)))
    const polishedRoughness = broad.mul(0.035).add(fine.mul(0.012)).add(0.12).clamp(0.07, 0.2)
    super(map, {
      color: '#e8dfd0',
      roughness: reflections ? 0.12 : 0.8,
      reflection: reflections ? {
        strength: 0.12,
        grazingStrength: 0.65,
        // Use the reflector's mip chain as a physical-looking roughness response instead of one global LOD.
        blur: polishedRoughness.mul(7).clamp(0.45, 1.55),
        mask: stone,
      } : undefined,
    })
    if (reflections) {
      // Grout stays honed while each marble tile receives subtle, low-frequency polish variation.
      this.roughnessNode = mix(float(0.78), polishedRoughness, stone)
    }
  }
}
