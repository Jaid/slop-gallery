import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'
import {liquidNormal, opticalLine} from '#src/lib/knots/shared.ts'
import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class AbyssalLanternMaterial extends KnotMaterial {
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
    const inner = p.sub(view.mul(0.17))
    const deep = p.sub(view.mul(0.28))
    const drift = vec3(0, time.mul(-0.045), time.mul(0.02))
    const chamber = mx_noise_float(inner.mul(11).add(drift))
    const membrane = opticalLine(chamber, 0.038)
    const distantCells = opticalLine(mx_noise_float(deep.mul(19).sub(drift)), 0.028)
    const pulse = inner.y.mul(9).sub(time.mul(0.65)).sin().mul(0.22).add(0.78)
    const glow = mix(color('#064fff'), color('#25ffd2'), chamber.mul(2).add(0.5).clamp())
    this.colorNode = mix(color('#020c24'), color('#073d52'), chamber.abs().mul(2).clamp())
    this.transmission = 0.38
    this.thickness = 0.42
    this.ior = 1.5
    this.attenuationColor.set('#087d9c')
    this.attenuationDistance = 0.6
    this.roughness = 0.095
    this.clearcoat = 0.9
    this.clearcoatRoughness = 0.045
    this.normalNode = liquidNormal(near, 0.16)
    this.emissiveNode = glow.mul(membrane).mul(pulse).mul(near.mul(0.7).add(0.55)).add(color('#3283ff').mul(distantCells).mul(near).mul(0.55)).add(color('#04bfb0').mul(rim).mul(0.14))
  }
}
