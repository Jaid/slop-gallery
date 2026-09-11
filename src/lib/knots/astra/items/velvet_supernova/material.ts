import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, vec3, vec4} from 'three/tsl'

import {opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class VelvetSupernovaMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    // World-unit camera distance, not screen UVs or changing texture scale.
    // Fine/deep layers fade in continuously on approach; their positions stay fixed.
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const inner = p.sub(view.mul(0.17))
    const deep = p.sub(view.mul(0.28))
    const dust = mx_noise_float(inner.mul(7)).mul(0.5).add(0.5)
    const nebula = dust.smoothstep(0.38, 0.76)
    const starlight = opticalLine(mx_noise_float(deep.mul(36)), 0.024).mul(opticalLine(mx_noise_float(deep.mul(39).add(7)), 0.03)).mul(near)
    const flash = view.dot(vec3(0.62, 0.35, 0.7).normalize()).abs().pow(5)
    this.colorNode = mix(color('#190927'), color('#642246'), nebula)
    this.roughnessNode = near.mul(0.1).add(0.62)
    this.sheen = 1
    this.sheenNode = mix(color('#6840c4'), color('#ffd1a2'), flash)
    this.sheenRoughness = 0.38
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(42)).mul(near), 0.000_25)
    this.emissiveNode = mix(color('#682773'), color('#f78a46'), flash).mul(nebula).mul(grazing.mul(0.35).add(0.15)).add(color('#ffe0ba').mul(starlight).mul(flash.mul(1.8).add(0.3)))
  }
}
