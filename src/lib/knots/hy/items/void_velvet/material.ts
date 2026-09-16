import type {Texture} from 'three/webgpu'

import {color, mx_noise_float, positionGeometry, normalViewGeometry, positionViewDirection, time} from 'three/tsl'

import {proceduralNormal, spectralColor} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class VoidVelvetMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.5)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(1.5)
    const fuzz = mx_noise_float(p.mul(18)).mul(0.5).add(0.5)
    const sheenHue = spectralColor(fuzz.add(time.mul(0.02)).add(grazing.mul(1.5)))
    this.colorNode = color('#040406')
    this.metalness = 0
    this.roughness = 1
    this.sheen = 1
    this.sheenRoughness = 0.7
    this.sheenNode = sheenHue.mul(rim).mul(2.5)
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(25)), 0.0008)
    this.emissiveNode = sheenHue.mul(rim.pow(3)).mul(0.2)
  }
}
