import type {Texture} from 'three/webgpu'

import {color, mix, mx_fractal_noise_float, mx_noise_float, mx_worley_noise_float, normalViewGeometry, positionGeometry, positionViewDirection} from 'three/tsl'

import {opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class CeladonCrackleMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    // Two crackle generations: a coarse craze plus a finer secondary net.
    const coarse = opticalLine(mx_worley_noise_float(p.mul(3.1)).sub(0.2), 0.012)
    const fine = opticalLine(mx_worley_noise_float(p.mul(7.4)).sub(0.16), 0.01).mul(0.55)
    const craze = coarse.max(fine)
    // Glaze pools thicker in the hollows, reading darker and greener.
    const pooling = mx_fractal_noise_float(p.mul(2.2), 3, 2, 0.5).mul(0.5).add(0.5)
    const speck = mx_noise_float(p.mul(26)).mul(0.5).add(0.5)
    const body = mix(color('#dfece2'), color('#7fb49d'), pooling.pow(1.4))
    this.colorNode = mix(body, color('#3c5f57'), craze.mul(0.8)).mul(speck.mul(0.06).add(0.97))
    this.metalness = 0
    this.roughnessNode = craze.mul(0.35).add(pooling.mul(0.06)).add(0.09)
    this.transmission = 0.18
    this.thickness = 0.22
    this.ior = 1.55
    this.attenuationColor.set('#6fae95')
    this.attenuationDistance = 0.3
    this.clearcoat = 1
    this.clearcoatRoughnessNode = craze.mul(0.25).add(0.04)
    this.sheen = 0.3
    this.sheenRoughness = 0.5
    this.sheenColor.set('#eaf6ee')
    this.normalNode = proceduralNormal(craze.mul(0.6).add(pooling.mul(0.3)), 0.0022)
    this.emissiveNode = color('#cfe8dc').mul(grazing.pow(4)).mul(0.1)
  }
}
