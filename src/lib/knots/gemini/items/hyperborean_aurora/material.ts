import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec4} from 'three/tsl'

import {opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class HyperboreanAuroraMaterial extends KnotMaterial {
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
    const latitude = inner.y.add(mx_noise_float(inner.mul(4)).mul(0.3))
    const curtains = latitude.mul(12).add(time.mul(0.4)).sin().mul(0.5).add(0.5)
    const fineIce = mx_noise_float(p.mul(32))
    const shimmer = opticalLine(deep.x.add(deep.z).mul(15).add(time.mul(0.8)).sin(), 0.04)
    this.colorNode = mix(color('#031a24'), color('#0d4238'), fineIce)
    this.transmission = 0.82
    this.thickness = 0.5
    this.ior = 1.31
    this.dispersion = 0.15
    this.attenuationColor.set('#043831')
    this.attenuationDistance = 0.45
    this.roughnessNode = fineIce.mul(0.06).add(0.02)
    this.clearcoat = 0.95
    this.clearcoatRoughness = 0.03
    this.normalNode = proceduralNormal(fineIce, 0.001)
    this.emissiveNode = mix(color('#2bf0a5'), color('#2b9df0'), curtains).mul(curtains.pow(1.5)).mul(near.mul(0.7).add(0.3)).add(color('#8affed').mul(shimmer).mul(near).mul(0.6)).add(color('#15df91').mul(rim).mul(0.25))
  }
}
