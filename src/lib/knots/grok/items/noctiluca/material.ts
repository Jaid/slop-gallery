import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'

import {liquidNormal, opticalLine} from '#src/lib/knots/shared.ts'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class NoctilucaMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(2)
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    // World-unit camera distance, not screen UVs or changing texture scale.
    // Fine/deep layers fade in continuously on approach; their positions stay fixed.
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const intimate = positionView.length().smoothstep(0.7, 2.4).oneMinus()
    const inner = p.sub(view.mul(0.17))
    const deep = p.sub(view.mul(0.28))
    const glance = grazing.pow(2.4)
    const drift = vec3(time.mul(0.035), time.mul(-0.055), time.mul(0.018))
    const bloomField = mx_noise_float(inner.mul(10).add(drift))
    const cells = opticalLine(bloomField, 0.032)
    const colony = opticalLine(mx_noise_float(deep.mul(18).sub(drift.mul(0.6))), 0.024)
    const breath = inner.y.mul(8).sub(time.mul(0.72)).sin().mul(0.2).add(0.8)
    const gather = bloomField.abs().smoothstep(0.05, 0.42)
    const wake = glance.mul(near)
    this.colorNode = mix(color('#020814'), color('#04353d'), gather)
    this.transmission = 0.46
    this.thickness = 0.4
    this.ior = 1.48
    this.attenuationColor.set('#046b6a')
    this.attenuationDistance = 0.58
    this.roughness = 0.08
    this.clearcoat = 0.88
    this.clearcoatRoughness = 0.04
    this.normalNode = liquidNormal(near.mul(0.8).add(0.15), 0.14)
    this.emissiveNode = mix(color('#00c2a8'), color('#b8ff7a'), gather).mul(cells).mul(breath).mul(near.mul(0.75).add(0.5)).add(color('#3dffd2').mul(colony).mul(intimate.mul(0.8).add(near.mul(0.35)))).add(color('#7affc8').mul(wake).mul(0.18)).add(color('#1458ff').mul(rim).mul(0.1))
  }
}
