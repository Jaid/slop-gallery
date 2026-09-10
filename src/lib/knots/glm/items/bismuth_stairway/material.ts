import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, vec4} from 'three/tsl'
import {opticalLine, proceduralNormal, spectralColor} from '#src/lib/knots/shared.ts'
import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class BismuthStairwayMaterial extends KnotMaterial {
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
    const terrain = mx_noise_float(p.mul(2.8)).mul(0.5).add(0.5)
    const steps = terrain.mul(6)
    const level = steps.floor()
    const rims = opticalLine(steps.sub(0.45).mul(Math.PI * 2).sin(), 0.8)
    const terraced = level.add(steps.fract().smoothstep(0.3, 0.7))
    // Eye height re-deals the rainbow: hue is keyed to terrace level plus view.
    const oxide = spectralColor(level.mul(0.9).add(view.y.mul(1.5)).add(view.x.mul(0.4)))
    this.colorNode = mix(color('#221d29'), oxide, rims.mul(0.45).add(0.55))
    this.metalness = 0.85
    this.roughnessNode = rims.oneMinus().mul(0.15).add(0.06)
    this.iridescence = 0.75
    this.iridescenceIOR = 1.3
    this.iridescenceThicknessNode = level.mul(60).add(240)
    this.clearcoat = 0.7
    this.clearcoatRoughness = 0.05
    this.normalNode = proceduralNormal(terraced.add(mx_noise_float(p.mul(26)).mul(0.15)), 0.006)
    this.emissiveNode = oxide.mul(rims).mul(near.mul(0.55).add(0.18)).mul(0.6).add(color('#9db4ff').mul(rim).mul(0.08))
  }
}
