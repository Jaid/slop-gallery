import type {Texture} from 'three/webgpu'

import {color, mix, mx_fractal_noise_float, sin, time, vec3} from 'three/tsl'

import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, intimate} = viewerFrame()
    const surfaceNoise = mx_fractal_noise_float(p.mul(20), 3, 2, 0.5)
    const surfaceRoughness = surfaceNoise.mul(0.4).add(0.3)
    const lightningNoise = mx_fractal_noise_float(p.mul(8).add(vec3(0, 0, time.mul(0.1))), 5, 2.5, 0.5)
    const veins = lightningNoise.smoothstep(0.45, 0.48).pow(3)
    const flash = sin(time.mul(15).add(p.y.mul(10))).pow(20).mul(intimate)
    const veinColor = mix(color('#aaddff'), color('#ffffff'), flash)
    this.colorNode = color('#a8b2c1')
    this.transmission = 0.85
    this.thicknessNode = veins.mul(1.5).add(0.5)
    this.ior = 1.45
    this.roughnessNode = surfaceRoughness
    this.metalness = 0
    this.attenuationColor.set('#4a5a7a')
    this.attenuationDistance = 1.2
    this.normalNode = proceduralNormal(surfaceNoise, 0.03)
    this.emissiveNode = veinColor.mul(veins).mul(5).add(color('#ffffff').mul(flash).mul(8))
    this.clearcoat = 0.8
    this.clearcoatRoughness = 0.2
  }
}
