import type {Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, normalGeometry, positionGeometry} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import knotData from './data.ts'
import {DISPLACEMENT} from './util.ts'

export default class FrostLatticeMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.85)
    this.name = knotData.id
    const p = positionGeometry
    const facets = mx_noise_float(p.mul(8)).mul(0.5).add(0.5)
    const bump = mx_noise_float(p.mul(24)).mul(0.5).add(0.5)
    this.positionNode = p.add(normalGeometry.mul(bump.sub(0.5).mul(DISPLACEMENT * 2)))
    this.colorNode = mix(color('#dff2ff'), color('#ffffff'), facets)
    this.transmission = 0.85
    this.thickness = 0.4
    this.ior = 1.31
    this.dispersion = 0.05
    this.attenuationColor.set('#bfe6ff')
    this.attenuationDistance = 0.7
    this.roughness = 0.08
    this.clearcoat = 0.7
    this.clearcoatRoughness = 0.05
    this.normalNode = proceduralNormal(facets, 0.0015)
  }
}
