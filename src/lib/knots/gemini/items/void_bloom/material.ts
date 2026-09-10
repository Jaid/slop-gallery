import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, mx_noise_vec3, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec4} from 'three/tsl'
import {filament, proceduralNormal} from '#src/lib/knots/shared.ts'
import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class VoidBloomMaterial extends KnotMaterial {
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
    const organicWarp = mx_noise_vec3(inner.mul(4))
    const petals = mx_noise_float(inner.mul(8).add(organicWarp)).smoothstep(0.2, 0.7)
    const biolumVeins = filament(mx_noise_float(p.mul(16).add(organicWarp.mul(0.5))), 0.015)
    const pulse = time.mul(1.2).add(p.y.mul(6)).sin().mul(0.3).add(0.7)
    this.colorNode = mix(color('#05020a'), color('#1c0b2b'), petals)
    this.roughnessNode = mix(0.1, 0.65, petals)
    this.clearcoat = 0.85
    this.clearcoatRoughness = 0.1
    this.normalNode = proceduralNormal(petals, 0.005)
    this.emissiveNode = mix(color('#7b1fa2'), color('#e040fb'), biolumVeins).mul(biolumVeins).mul(pulse).mul(near.mul(0.75).add(0.25)).add(color('#4a148c').mul(rim).mul(0.3))
  }
}
