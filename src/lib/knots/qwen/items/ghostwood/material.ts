import type {Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, vec3} from 'three/tsl'

import {opticalBands, proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class GhostwoodMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const grain = mx_noise_float(vec3(p.x.mul(2), p.y.mul(40), p.z.mul(2)))
    const rings = opticalBands(grain.mul(8))
    const aura = grazing.pow(3)
    this.colorNode = mix(color('#e6f2ff'), color('#88aacc'), rings.mul(0.3))
    this.transmission = 0.4
    this.thickness = 0.5
    this.ior = 1.3
    this.roughnessNode = rings.mul(0.3).add(0.4)
    this.normalNode = proceduralNormal(grain, 0.01)
    this.emissiveNode = color('#cceeff').mul(aura).mul(1.5).add(color('#ffffff').mul(grain.pow(4)).mul(near).mul(0.5))
  }
}
