import type {Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, mx_worley_noise_float, normalViewGeometry, positionGeometry, positionViewDirection, time} from 'three/tsl'

import {proceduralNormal, spectralColor} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class NacreShellMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.0)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(2)
    const platelets = mx_worley_noise_float(p.mul(8)).mul(0.5).add(0.5)
    const shift = platelets.mul(2).add(time.mul(0.05)).add(grazing.mul(2))
    const film = spectralColor(shift)
    const nacre = mix(color('#fdf6e3'), film, 0.55)
    this.colorNode = nacre
    this.metalness = 0.1
    this.roughness = 0.08
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(20)), 0.0009)
    this.iridescence = 1
    this.iridescenceIOR = 1.4
    this.iridescenceThicknessNode = platelets.mul(400).add(100).add(time.mul(20))
    this.clearcoat = 1
    this.clearcoatRoughness = 0.02
    this.emissiveNode = color('#fffaf0').mul(rim.pow(3)).mul(0.15).add(film.mul(grazing.mul(0.25)))
  }
}
