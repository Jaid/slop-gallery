import type {Texture} from 'three/webgpu'

import {color, mix, mx_fractal_noise_float, mx_noise_float, positionGeometry, sin, time} from 'three/tsl'

import filament, {proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class BioluminescentVeinsMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.7)
    this.name = knotData.id
    const p = positionGeometry
    const flow = mx_fractal_noise_float(p.mul(3.2), 3, 2, 0.5)
    const veins = filament(flow, 0.03)
    const fineVeins = filament(mx_noise_float(p.mul(9)), 0.02)
    const pulse = sin(time.mul(0.9).add(flow.mul(4))).mul(0.5).add(0.5)
    this.colorNode = mix(color('#050a10'), color('#0a1a1c'), mx_noise_float(p.mul(4)).mul(0.5).add(0.5))
    this.roughness = 0.5
    this.metalness = 0
    this.clearcoat = 0.4
    this.clearcoatRoughness = 0.25
    this.normalNode = proceduralNormal(flow, 0.0011)
    this.emissiveNode = color('#00ffc8').mul(veins).mul(pulse.mul(0.7).add(0.3)).mul(1.6).add(color('#0090ff').mul(fineVeins).mul(0.5))
  }
}
