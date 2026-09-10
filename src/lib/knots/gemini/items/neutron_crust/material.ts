import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec4} from 'three/tsl'
import {opticalBands, opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'
import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class NeutronCrustMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const inner = p.sub(view.mul(0.17))
    const deep = p.sub(view.mul(0.28))
    const crust = mx_noise_float(p.mul(30))
    const latticeGrid = opticalBands(inner.x.mul(40)).mul(opticalBands(inner.z.mul(40)))
    const gravitonArcs = opticalLine(mx_noise_float(deep.mul(18).add(time.mul(0.6))), 0.02)
    this.colorNode = mix(color('#121110'), color('#2b2823'), crust)
    this.metalness = 0.88
    this.roughnessNode = crust.mul(0.2).add(0.1)
    this.clearcoat = 0.5
    this.clearcoatRoughness = 0.15
    this.normalNode = proceduralNormal(crust, 0.006)
    this.emissiveNode = color('#ffcc00').mul(latticeGrid).mul(near.mul(0.6).add(0.4)).add(color('#ffffff').mul(gravitonArcs).mul(near).mul(1.2)).add(color('#ff9900').mul(facing.pow(4)).mul(0.3))
  }
}
