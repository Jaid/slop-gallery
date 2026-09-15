import type {Texture} from 'three/webgpu'

import {bumpMap, color, float, mx_noise_float, positionWorld, texture, vec3} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

/** Restrained architectural plaster: large mottling plus fine surface grain in quality mode. */
export default class ArchitecturalPlasterMaterial extends MeshStandardNodeMaterial {
  constructor({baseColor, map, quality, roughness}: {
    baseColor: string
    map?: Texture
    quality: boolean
    roughness: number
  }) {
    super({
      color: baseColor,
      map: quality ? null : map,
      roughness,
      metalness: 0,
      envMapIntensity: 1,
    })
    if (!quality) {
      return
    }
    const broad = mx_noise_float(positionWorld.mul(vec3(0.34, 0.22, 0.34)))
    const grain = mx_noise_float(positionWorld.mul(18))
    const base = map ? texture(map).rgb.mul(color(baseColor)) : color(baseColor)
    const height = broad.mul(0.22).add(grain.mul(0.055))
    this.colorNode = base.mul(broad.mul(0.026).add(grain.mul(0.008)).add(1))
    this.roughnessNode = broad.mul(0.035).add(grain.mul(0.012)).add(roughness).clamp(0.78, 0.97)
    this.normalNode = bumpMap(height, float(0.0011))
  }
}
