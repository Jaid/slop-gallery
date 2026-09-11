import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'

import filament, {proceduralNormal, spectralColor} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class BismuthSingularityMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(2)
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const deep = p.sub(view.mul(0.28))
    const terraces = p.mul(18).floor().dot(vec3(1, 1, 1))
    const crystalIridescence = spectralColor(terraces.mul(0.35).add(view.x.mul(4)).add(view.y.mul(2)))
    const coreNoise = mx_noise_float(deep.mul(8).add(time.mul(0.2)))
    const goldVeins = filament(mx_noise_float(p.mul(14)), 0.018)
    this.colorNode = mix(color('#0a0d14'), crystalIridescence, 0.75)
    this.metalness = 0.95
    this.roughnessNode = mix(0.04, 0.28, mx_noise_float(p.mul(25)).add(0.5).mul(0.5))
    this.iridescence = 1
    this.iridescenceIOR = 1.9
    this.iridescenceThicknessNode = terraces.mul(30).add(400)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.02
    this.normalNode = proceduralNormal(terraces.mul(0.1), 0.008)
    this.emissiveNode = mix(color('#00f0ff'), color('#ff00a0'), coreNoise).mul(goldVeins).mul(near.mul(0.8).add(0.2)).add(crystalIridescence.mul(rim.pow(3)).mul(0.3))
  }
}
