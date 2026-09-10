import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, uv, vec4} from 'three/tsl'
import {filament, opticalBands, proceduralNormal, spectralColor} from '#src/lib/knots/shared.ts'
import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class ScarabReliquaryMaterial extends KnotMaterial {
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
    // 51 grooves on a whole multiple of the uv.y wrap keep the tube seam invisible.
    const groove = uv().y.mul(51 * Math.PI * 2)
    const threads = opticalBands(groove)
    const sheen = spectralColor(view.y.mul(1.25).add(uv().y.mul(9 * Math.PI * 2)).add(view.x.mul(0.7)))
    const goldDust = filament(mx_noise_float(p.mul(90)), 0.016)
    this.colorNode = mix(color('#07231a'), sheen, threads.mul(0.4).add(0.15))
    this.metalnessNode = goldDust.mul(0.18).add(0.72)
    this.roughnessNode = threads.mul(0.06).add(0.075)
    this.iridescence = 1
    this.iridescenceIOR = 1.42
    this.iridescenceThicknessNode = view.y.mul(90).add(430)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.03
    this.normalNode = proceduralNormal(groove.sin(), 0.00035)
    this.emissiveNode = sheen.mul(threads).mul(rim).mul(near.mul(0.5).add(0.12)).mul(0.5).add(color('#ffd98a').mul(goldDust).mul(near).mul(0.85))
  }
}
