import type {Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, mx_worley_noise_float, positionGeometry} from 'three/tsl'

import filament, {proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class RustCeramicMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.95)
    this.name = knotData.id
    const p = positionGeometry
    const glaze = mx_noise_float(p.mul(3.5)).mul(0.5).add(0.5)
    const cracksField = mx_worley_noise_float(p.mul(7)).sub(0.3)
    const cracks = filament(cracksField, 0.02)
    this.colorNode = mix(color('#e8e0d4'), color('#b5651d'), glaze.smoothstep(0.35, 0.75))
    this.roughness = 0.55
    this.metalness = 0.05
    this.clearcoat = 0.9
    this.clearcoatRoughness = 0.15
    this.normalNode = proceduralNormal(cracksField, 0.0012)
    this.emissiveNode = color('#7a2c0a').mul(cracks).mul(0.3)
  }
}
