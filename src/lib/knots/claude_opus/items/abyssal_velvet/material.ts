import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_fractal_noise_float, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec4} from 'three/tsl'

import {proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class AbyssalVelvetMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.55)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    // Dense matted fibre, then photophores that breathe on their own phases.
    const pile = mx_fractal_noise_float(p.mul(11), 4, 2, 0.55)
    const fuzz = mx_noise_float(p.mul(38)).mul(0.5).add(0.5)
    const seeds = mx_noise_float(p.sub(view.mul(0.06)).mul(13))
    const photophores = seeds.smoothstep(0.42, 0.62)
    const phase = mx_noise_float(p.mul(2.3)).mul(6.283)
    const pulse = time.mul(0.55).add(phase).sin().mul(0.5).add(0.5)
    this.colorNode = mix(color('#050a10'), color('#123038'), pile.mul(0.5).add(0.5))
    this.metalness = 0
    this.roughnessNode = fuzz.mul(0.1).add(0.82)
    this.sheen = 1
    this.sheenRoughness = 0.35
    this.sheenColor.set('#2fd8c8')
    this.specularIntensity = 0.2
    this.normalNode = proceduralNormal(pile.add(fuzz.mul(0.35)), 0.0026)
    this.emissiveNode = color('#37f0d2').mul(photophores).mul(pulse.mul(0.75).add(0.25)).mul(near.mul(0.5).add(0.55)).mul(1.4).add(color('#1ba8c8').mul(grazing.pow(2)).mul(0.22))
  }
}
