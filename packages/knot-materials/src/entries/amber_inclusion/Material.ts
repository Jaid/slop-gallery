import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_fractal_noise_float, mx_noise_float, mx_worley_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, vec4} from 'three/tsl'

import {filament} from '../../lib/filament.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import knotData from './data.ts'

export default class AmberInclusionMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1)
    this.name = knotData.id
    const p = positionGeometry
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const rim = facing.oneMinus().pow(3)
    // Trapped matter at two depths: bright bubbles nearer the surface, dark fibres deeper in.
    const inner = p.sub(view.mul(0.14))
    const deep = p.sub(view.mul(0.3))
    const resin = mx_fractal_noise_float(p.mul(2.6), 4, 2, 0.5).mul(0.5).add(0.5)
    const bubbles = mx_noise_float(inner.mul(15)).smoothstep(0.42, 0.62)
    const debris = filament(mx_worley_noise_float(deep.mul(6)).sub(0.35), 0.03)
    this.colorNode = mix(color('#4a1c02'), color('#e9a63d'), resin).mul(debris.mul(-0.55).add(1))
    this.transmission = 0.9
    this.thickness = 1.1
    this.ior = 1.55
    this.dispersion = 0.14
    this.attenuationColor.set('#8a3a04')
    this.attenuationDistance = 0.5
    this.roughnessNode = resin.mul(0.05).add(0.05)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.03
    this.normalNode = proceduralNormal(resin.mul(0.7), 0.0014)
    this.emissiveNode = color('#ffd9a0').mul(bubbles).mul(near.mul(0.6).add(0.4)).mul(0.45).add(color('#ff9a2e').mul(rim).mul(0.25))
  }
}
