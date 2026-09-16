import type {Texture} from 'three/webgpu'

import {color, mx_noise_float, positionGeometry, positionView, time, vec3} from 'three/tsl'

import filament, {proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class PlasmaWeaveMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.7)
    this.name = knotData.id
    const p = positionGeometry
    const intimate = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const weave = mx_noise_float(p.mul(4).add(vec3(time.mul(0.03), time.mul(-0.02), 0)))
    const threads = filament(weave.sub(0.1), 0.02)
    const glow = color('#00e5ff').mul(threads).mul(intimate.mul(0.8).add(0.2))
    const secondary = filament(mx_noise_float(p.mul(7).sub(time.mul(0.04))).add(0.2), 0.015)
    this.colorNode = color('#05070a')
    this.metalness = 0.2
    this.roughness = 0.4
    this.normalNode = proceduralNormal(weave, 0.001)
    this.emissiveNode = glow.mul(2.5).add(color('#b400ff').mul(secondary).mul(intimate).mul(1.2))
  }
}
