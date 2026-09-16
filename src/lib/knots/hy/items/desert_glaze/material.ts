import type {Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, mx_worley_noise_float, positionGeometry, normalViewGeometry, positionViewDirection} from 'three/tsl'

import {opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class DesertGlazeMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const crackle = mx_worley_noise_float(p.mul(4))
    const lines = opticalLine(crackle.sub(0.42), 0.015)
    const sand = mx_noise_float(p.mul(10)).mul(0.5).add(0.5)
    const clay = mix(color('#c2a077'), color('#8c6239'), sand)
    const glaze = mix(color('#2d5f7a'), color('#1b3a4a'), sand)
    const pool = mx_noise_float(p.mul(2)).smoothstep(0.4, 0.6)
    this.colorNode = mix(clay, glaze, pool).add(color('#ffffff').mul(lines).mul(0.1))
    this.metalness = 0.05
    this.roughnessNode = mix(0.6, 0.25, pool).add(lines.mul(0.4))
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(16)), 0.0015)
    this.clearcoat = 0.9
    this.clearcoatRoughness = 0.06
    this.emissiveNode = color('#5fd0ff').mul(lines).mul(grazing).mul(0.3)
  }
}
