import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec4} from 'three/tsl'

import {opticalLine, spectralColor} from '#src/lib/knots/shared.ts'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class ChitinPhantomMaterial extends KnotMaterial {
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
    const shellStructure = mx_noise_float(inner.mul(10)).add(facing.mul(3))
    const iridescence = spectralColor(shellStructure.mul(5).add(view.z.mul(4)))
    const mist = opticalLine(mx_noise_float(deep.mul(12).add(time.mul(0.15))), 0.04)
    this.colorNode = mix(color('#07171e'), iridescence, 0.45)
    this.metalness = 0.5
    this.roughnessNode = near.mul(-0.05).add(0.12)
    this.iridescence = 1
    this.iridescenceIOR = 1.6
    this.iridescenceThicknessNode = shellStructure.mul(80).add(200)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.03
    this.emissiveNode = color('#30f0e0').mul(mist).mul(near).add(iridescence.mul(rim.pow(2)).mul(0.4))
  }
}
