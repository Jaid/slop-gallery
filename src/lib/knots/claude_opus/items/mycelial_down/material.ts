import type {Texture} from 'three/webgpu'

import {color, mix, mx_fractal_noise_float, mx_noise_float, mx_worley_noise_float, positionGeometry, time} from 'three/tsl'

import filament, {proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class MycelialDownMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.7)
    this.name = knotData.id
    const p = positionGeometry
    const fuzz = mx_fractal_noise_float(p.mul(16), 4, 2, 0.6).mul(0.5).add(0.5)
    const veins = filament(mx_worley_noise_float(p.mul(4.5)).sub(0.3), 0.02)
    const spores = mx_noise_float(p.mul(26)).smoothstep(0.62, 0.78)
    // Each sporing cluster breathes on its own slow phase.
    const phase = mx_noise_float(p.mul(3)).mul(6.283)
    const breath = time.mul(0.6).add(phase).sin().mul(0.5).add(0.5)
    this.colorNode = mix(color('#2a1b2e'), color('#6b4a63'), fuzz).mul(veins.mul(-0.4).add(1))
    this.metalness = 0
    this.roughnessNode = fuzz.mul(0.12).add(0.82)
    this.sheen = 1
    this.sheenRoughness = 0.4
    this.sheenColor.set('#d9b6ff')
    this.normalNode = proceduralNormal(fuzz, 0.0022)
    this.emissiveNode = color('#9cf5c8').mul(spores).mul(breath.mul(0.8).add(0.2)).mul(0.9).add(color('#7de0ff').mul(veins).mul(0.12))
  }
}
