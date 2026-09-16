import type {Texture} from 'three/webgpu'
import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, mx_worley_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'
import {opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'
import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class FerriteSandMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.85)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(2)
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const inner = p.sub(view.mul(0.17))
    const drift = vec3(time.mul(0.03), time.mul(0.02), time.mul(-0.025))
    const mineral = mx_noise_float(p.mul(6)).mul(0.5).add(0.5)
    const fieldLines = opticalLine(mx_worley_noise_float(inner.mul(3.2).add(drift)).sub(0.3), 0.018)
    this.colorNode = mix(color('#141a20'), color('#4b5a68'), mineral)
    this.metalness = 0.22
    this.roughness = 0.34
    this.clearcoat = 0.35
    this.clearcoatRoughness = 0.2
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(14)), 0.0014)
    this.emissiveNode = color('#29d9ff').mul(fieldLines).mul(near.mul(0.9).add(0.15)).add(color('#ff8c42').mul(rim).mul(0.1))
  }
}
