import type {Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, mx_worley_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection} from 'three/tsl'

import {opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class KilnCrawlMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(2)
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const glaze = mx_noise_float(p.mul(5)).mul(0.5).add(0.5)
    const cracks = opticalLine(mx_worley_noise_float(p.mul(4.2)).sub(0.35), 0.012)
    this.colorNode = mix(color('#0f3b3c'), color('#e8dccb'), glaze)
    this.roughness = 0.18
    this.metalness = 0.05
    this.clearcoat = 0.9
    this.clearcoatRoughness = 0.08
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(16)), 0.001)
    this.emissiveNode = color('#ff5a1f').mul(cracks).mul(near.mul(0.8).add(0.3)).mul(1.4).add(color('#ffb347').mul(cracks.pow(2)).mul(0.5)).add(color('#ffe9c9').mul(rim).mul(0.06))
  }
}
