import type {Texture} from 'three/webgpu'

import {color, mix, mx_fractal_noise_float, mx_noise_float, time, vec3} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import {opticalLine, proceduralNormal, viewerFrame} from '../../flashHelpers.ts'
import knotData from './data.ts'

export default class HeliosForgeMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    this.envMapIntensity = 0.4
    const {p, grazing, rim, intimate} = viewerFrame()
    const granule = mx_fractal_noise_float(p.mul(18), 3, 2, 0.55)
    const granule2 = mx_noise_float(p.mul(42).add(time.mul(0.06)))
    const field = mx_noise_float(p.mul(6).add(vec3(time.mul(0.05), 0, time.mul(-0.04))))
    const loop = opticalLine(field.mul(16).sin(), 0.04)
    const plasma = granule.mul(0.5).add(granule2.mul(0.25)).add(0.35)
    const heat = plasma.mul(0.8).add(loop.mul(0.9))
    const fire = mix(color('#7a1200'), color('#ff7a1a'), heat.clamp()).add(color('#fff1b8').mul(heat.max(0).pow(3)).mul(0.6))
    this.colorNode = fire
    this.metalness = 0
    this.roughnessNode = heat.mul(-0.3).add(0.65)
    this.clearcoat = 0.15
    this.clearcoatRoughness = 0.4
    this.normalNode = proceduralNormal(granule.mul(0.5).add(granule2.mul(0.3)), 0.004)
    this.emissiveNode = fire.mul(0.4).add(color('#ff7a1a').mul(loop).mul(1.2)).add(color('#fff1b8').mul(plasma.abs().pow(2)).mul(0.8)).add(color('#ffb347').mul(rim).mul(grazing).mul(0.6)).add(color('#ff4d00').mul(granule2.smoothstep(0.6, 0.9)).mul(intimate).mul(0.5))
  }
}
