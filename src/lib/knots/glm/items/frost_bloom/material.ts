import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {fbm, opticalLine, proceduralNormal, starGlints} from '../../helpers.ts'
import knotData from './data.ts'

export default class FrostBloomMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const grazing = normalViewGeometry.dot(positionViewDirection).abs().clamp().oneMinus()
    const rim = grazing.pow(2)
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const patch = fbm(p.mul(2.9)).mul(0.5).add(0.5)
    const patchMask = patch.smoothstep(0.52, 0.8)
    const frostLines = opticalLine(fbm(p.mul(8.5)).sub(0.05), 0.05).mul(patchMask)
    const frostFine = opticalLine(fbm(p.mul(21), 2).sub(0.05), 0.038).mul(patchMask).mul(near)
    const frost = frostLines.add(frostFine).clamp()
    const core = p.sub(view.mul(0.3))
    const coreField = fbm(core.mul(3.4).add(vec3(0, time.mul(0.04), 0))).add(core.y.mul(0.8))
    const heartGlow = coreField.smoothstep(0.42, 1.05)
    const aurora = mix(color('#2ee8cf'), color('#8f7bff'), coreField.mul(0.5).add(0.5).clamp().pow(1.6))
    const glitter = starGlints(p.mul(85), view, 28)
    this.colorNode = mix(color('#cfe7f6'), color('#f6fcff'), fbm(p.mul(6), 2).mul(0.5).add(0.5))
    this.transmission = 0.96
    this.thickness = 0.9
    this.ior = 1.31
    this.dispersion = 0.34
    this.attenuationColor.set('#a8e0ff')
    this.attenuationDistance = 1.6
    this.roughnessNode = frost.mul(0.52).add(0.045)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.03
    this.iridescence = 0.25
    this.iridescenceIOR = 1.3
    this.iridescenceThicknessNode = frost.mul(260).add(320)
    this.normalNode = proceduralNormal(frost.mul(0.7).add(mx_noise_float(p.mul(52)).mul(frost).mul(0.18)), 0.0011)
    this.emissiveNode = aurora.mul(heartGlow).mul(near.mul(0.5).add(0.3)).mul(0.85)
      .add(color('#eefaff').mul(frost).mul(rim).mul(0.55))
      .add(color('#d8f2ff').mul(glitter).mul(near).mul(2))
      .add(color('#bfe9ff').mul(rim).mul(0.1))
  }
}
