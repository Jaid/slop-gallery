import type {Texture} from 'three/webgpu'

import {color, mix, mx_cell_noise_float, mx_noise_float} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {cellNoiseVec3, opticalLine, proceduralNormal, viewerFrame} from '../../flashHelpers.ts'
import knotData from './data.ts'

export default class CryoBloomMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    this.envMapIntensity = 1.2
    const {p, facing, rim, near, intimate} = viewerFrame()
    const cell = cellNoiseVec3(p.mul(14))
    const frost = mx_noise_float(p.mul(28).add(cell.mul(1.5)))
    const crystal = mx_cell_noise_float(p.mul(22))
    const facet = crystal.smoothstep(0.4, 0.6)
    const frostLine = opticalLine(frost.mul(20).sin(), 0.04)
    const crack = opticalLine(cellNoiseVec3(p.mul(9)).x.mul(18).sin(), 0.03)
    const ice = mix(color('#0b3a4a'), color('#bff7ff'), facet.mul(0.7).add(frostLine.mul(0.4)))
    this.colorNode = ice
    this.transmission = 0.85
    this.thickness = 0.7
    this.ior = 1.31
    this.dispersion = 0.15
    this.attenuationColor.set('#1b6f7a')
    this.attenuationDistance = 0.8
    this.roughnessNode = facet.mul(0.18).add(0.04)
    this.metalness = 0
    this.clearcoat = 1
    this.clearcoatRoughness = 0.02
    this.iridescence = 0.5
    this.iridescenceIOR = 1.3
    this.iridescenceThicknessNode = facing.mul(220).add(180)
    this.normalNode = proceduralNormal(facet.mul(0.7).add(frost.mul(0.2)), 0.002)
    this.emissiveNode = mix(color('#9befff'), color('#ffffff'), facing).mul(frostLine.add(crack).mul(0.8)).mul(near.mul(0.6).add(0.2)).add(color('#58d9ff').mul(rim).mul(0.25)).add(color('#bbfff1').mul(facet.smoothstep(0.7, 0.9)).mul(intimate).mul(0.4))
  }
}
