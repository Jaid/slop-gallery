import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, mx_noise_vec3, normalLocal, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec4} from 'three/tsl'

import {opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class SolarChromosphereMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(2)
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const inner = p.sub(view.mul(0.17))
    const deep = p.sub(view.mul(0.28))
    const turbulence = mx_noise_vec3(p.mul(6).add(time.mul(0.1)))
    const prominences = mx_noise_float(inner.mul(10).add(turbulence)).smoothstep(0.3, 0.8)
    const flares = opticalLine(mx_noise_float(deep.mul(28).sub(time.mul(0.3))), 0.02)
    const heatShift = view.dot(normalLocal).abs().pow(2)
    this.colorNode = mix(color('#2b0400'), color('#8a1000'), prominences)
    this.roughnessNode = near.mul(-0.1).add(0.45)
    this.sheen = 1
    this.sheenNode = mix(color('#ff5500'), color('#ffea00'), heatShift)
    this.sheenRoughness = 0.25
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(18)), 0.003)
    this.emissiveNode = mix(color('#ff2200'), color('#ffaa00'), prominences).mul(prominences.mul(2.5).add(0.2)).add(color('#ffffff').mul(flares).mul(near).mul(1.5)).add(color('#ff5500').mul(rim.pow(1.5)).mul(0.8))
  }
}
