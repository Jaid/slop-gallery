import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'

import {liquidNormal, opticalBands} from '#src/lib/knots/shared.ts'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class MercuryTideMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(2)
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const waveHeight = mx_noise_float(p.mul(6).add(vec3(0, time.mul(0.12), 0)))
    const ripple = opticalBands(waveHeight.mul(24).sub(time.mul(0.6)))
    const sky = mix(color('#c9ced6'), color('#eef6ff'), view.y.mul(0.5).add(0.5).clamp())
    this.colorNode = mix(color('#7d838f'), sky, waveHeight.mul(0.5).add(0.5))
    this.metalness = 0.95
    this.roughnessNode = ripple.mul(0.05).add(0.05)
    this.iridescence = 0.4
    this.iridescenceIOR = 1.3
    this.iridescenceThicknessNode = waveHeight.mul(80).add(260)
    this.clearcoat = 0.5
    this.clearcoatRoughness = 0.03
    this.normalNode = liquidNormal(near, 0.22)
    this.emissiveNode = color('#eaf6ff').mul(ripple).mul(rim.mul(0.6).add(0.15)).mul(near.mul(0.4).add(0.3)).add(color('#9fd8ff').mul(rim.pow(2)).mul(0.2))
  }
}
