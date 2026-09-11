import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, mx_worley_noise_float, time, vec3} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import viewerFrame, {opticalLine, proceduralNormal} from '../../helpers.ts'
import knotData from './data.ts'

export default class KintsugiSoulMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, rim, near, intimate} = viewerFrame()
    const crackle = mx_worley_noise_float(p.mul(5.5).add(vec3(0, time.mul(0.04), 0)))
    const cracks = opticalLine(crackle.sub(0.26), 0.007).mul(intimate.mul(0.5).add(0.7))
    const porcelain = mix(color('#f4f1ea'), color('#d8cec1'), mx_noise_float(p.mul(2.5)).mul(0.3).add(0.5))
    this.colorNode = mix(porcelain, color('#e8c37a'), cracks)
    this.metalness = 0.04
    this.metalnessNode = cracks.mul(0.96)
    this.roughnessNode = mix(float(0.28), float(0.1), cracks)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.028
    this.normalNode = proceduralNormal(cracks.mul(0.8), 0.0006)
    const soulGlow = cracks.mul(near.mul(0.75).add(0.45)).mul(time.mul(0.9).sin().mul(0.15).add(0.95))
    this.emissiveNode = color('#ffb457').mul(soulGlow).mul(1.7).add(color('#ff6a00').mul(cracks.pow(2)).mul(0.9)).add(porcelain.mul(rim).mul(0.12))
  }
}
