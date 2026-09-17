import type {Texture} from 'three/webgpu'

import {color, mix, mx_fractal_noise_float, positionGeometry} from 'three/tsl'

import {proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class InkMarbleMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const p = positionGeometry
    const warp = mx_fractal_noise_float(p.mul(2.2), 4, 2.1, 0.55)
    const veins = mx_fractal_noise_float(p.mul(6).add(warp.mul(1.4)), 3, 2, 0.5).mul(0.5).add(0.5)
    const marble = mix(color('#08080d'), color('#eaeaf0'), veins.smoothstep(0.42, 0.58))
    this.colorNode = mix(marble, color('#3a3a55'), veins.smoothstep(0.6, 0.82))
    this.transmission = 0.4
    this.thickness = 0.6
    this.ior = 1.52
    this.attenuationColor.set('#111116')
    this.attenuationDistance = 0.9
    this.roughness = 0.18
    this.clearcoat = 0.8
    this.clearcoatRoughness = 0.1
    this.normalNode = proceduralNormal(veins, 0.0008)
  }
}
