import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, uv, vec3, vec4} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import {hash1, opticalLine, proceduralNormal} from '../../helpers.ts'
import knotData from './data.ts'

export default class SolarSilkMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const grazing = normalViewGeometry.dot(positionViewDirection).abs().clamp().oneMinus()
    const rim = grazing.pow(2)
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const intimate = positionView.length().smoothstep(0.8, 2.7).oneMinus()
    const strand = uv()
    const threadCount = 96
    const lane = strand.y.mul(threadCount)
    const threadIndex = lane.floor().mul(1 / threadCount).fract().mul(threadCount)
    const thread = lane.fract().sub(0.5)
    const crown = thread.abs().smoothstep(0.12, 0.45).oneMinus()
    const blockIndex = strand.x.mul(72).floor()
    const weave = threadIndex.add(blockIndex).mul(0.5).fract().mul(2)
    const threadRand = hash1(vec3(threadIndex, 2.7, 9.1)).mul(0.5).add(0.5)
    const sheen = opticalLine(p.y.mul(2.1).add(view.x.mul(2.7)).add(view.z.mul(1.9)).add(threadRand.mul(0.9)).add(time.mul(0.05)).sin(), 0.085)
    const dust = hash1(vec3(threadIndex.mul(1.31), strand.x.mul(240).floor(), 5.5)).smoothstep(0.62, 0.88).mul(intimate)
    this.colorNode = mix(color('#e8d0a8'), color('#fff8e8'), crown).add(color('#fff4d8').mul(sheen).mul(0.3))
    this.metalness = 0.22
    this.roughnessNode = weave.oneMinus().mul(0.24).add(thread.abs().mul(0.09)).add(0.15)
    this.anisotropy = 1
    this.anisotropyNode = crown.mul(0.6).add(0.4)
    this.iridescence = 0.5
    this.iridescenceIOR = 1.32
    this.iridescenceThicknessNode = threadRand.mul(380).add(150)
    this.sheen = 0.55
    this.sheenColor.set('#ffd9a8')
    this.sheenRoughness = 0.42
    this.clearcoat = 0.32
    this.clearcoatRoughness = 0.12
    this.envMapIntensity = 1.05
    this.normalNode = proceduralNormal(crown.add(mx_noise_float(p.mul(90)).mul(0.12)), 0.0016)
    this.emissiveNode = color('#ffdf9e').mul(sheen).mul(near.mul(0.5).add(0.2)).mul(weave.mul(0.5).add(0.5))
      .add(color('#fff3d2').mul(dust).mul(1.3))
      .add(color('#f7c873').mul(rim).mul(0.3))
  }
}
