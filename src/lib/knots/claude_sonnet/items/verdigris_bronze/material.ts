import type {Texture} from 'three/webgpu'

import {color, mix, mx_fractal_noise_float, mx_noise_float, positionGeometry} from 'three/tsl'

import {proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class VerdigrisBronzeMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1)
    this.name = knotData.id
    const p = positionGeometry
    const patina = mx_fractal_noise_float(p.mul(2.4), 4, 2, 0.55).mul(0.5).add(0.5)
    const speckle = mx_noise_float(p.mul(20)).mul(0.5).add(0.5)
    const bronze = color('#8a5a32')
    const green = color('#4c9a7a')
    const deep = color('#1f4a3d')
    const base = mix(bronze, green, patina.smoothstep(0.35, 0.7))
    this.colorNode = mix(base, deep, patina.smoothstep(0.75, 0.95))
    this.metalness = 0.85
    this.roughnessNode = patina.mul(0.35).add(0.15).add(speckle.mul(0.05))
    this.clearcoat = 0.3
    this.clearcoatRoughness = 0.2
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(14)), 0.0009)
    this.envMapIntensity = 1.2
  }
}
