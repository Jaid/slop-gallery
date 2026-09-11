import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec4} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import {opticalBands, opticalLine, proceduralNormal} from '../../helpers.ts'
import knotData from './data.ts'

export default class MagmaChrysalisMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    this.envMapIntensity = 1
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.abs().pow(2)
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const intimate = positionView.length().smoothstep(0.8, 2.7).oneMinus()
    const riftNoise = mx_noise_float(p.mul(6.5)).mul(0.4)
    const riftNoiseFine = mx_noise_float(p.mul(18)).mul(0.15)
    const riftField = p.x.mul(9).sin().mul(p.y.mul(9).cos()).add(p.z.mul(9).sin()).add(riftNoise).add(riftNoiseFine)
    const rift = opticalLine(riftField, 0.075)
    const riftCore = opticalLine(riftField, 0.028)
    const deep = p.sub(view.mul(0.24))
    const mantleNoise = mx_noise_float(deep.mul(14).sub(time.mul(0.25))).mul(0.5).add(0.5)
    const convectiveCells = opticalBands(deep.y.mul(22).add(mantleNoise.mul(4)))
    const lava = mix(mix(color('#6b0b00'), color('#ff5500'), rift), color('#fff5b8'), riftCore.mul(convectiveCells.mul(0.5).add(0.5)))
    this.colorNode = mix(color('#080404'), color('#1a0808'), rift.mul(0.4))
    this.metalness = 0.1
    this.roughness = 0.035
    this.clearcoat = 1
    this.clearcoatRoughness = 0.016
    this.normalNode = proceduralNormal(riftNoise.mul(intimate), 0.0016)
    this.emissiveNode = lava.mul(rift).mul(near.mul(0.65).add(0.45)).add(color('#fff0a0').mul(riftCore).mul(near.mul(0.7).add(0.5)).mul(1.5)).add(color('#ff3700').mul(rim.pow(3)).mul(0.35))
  }
}
