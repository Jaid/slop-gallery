import type {Texture} from 'three/webgpu'

import {color, mix, mx_cell_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {opticalLine, proceduralNormal, spectralColor} from '../../helpers.ts'
import knotData from './data.ts'

export default class ScarabAegisMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    this.envMapIntensity = 1.05
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.abs().pow(2)
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const intimate = positionView.length().smoothstep(0.8, 2.7).oneMinus()
    const braggPhase = grazing.pow(1.6).mul(4.5).add(0.4)
    const structuralColor = spectralColor(braggPhase)
    const jewelColor = mix(mix(color('#10b981'), color('#fbbf24'), facing.abs().pow(2)), color('#7c3aed'), grazing.pow(1.8))
    const cuticle = mx_cell_noise_float(p.mul(36))
    const facetEdges = opticalLine(cuticle.sub(0.5).abs(), 0.05)
    const facetNormal = proceduralNormal(cuticle.mul(intimate), 0.0018)
    this.metalness = 0.58
    this.normalNode = facetNormal
    this.roughnessNode = facetEdges.mul(0.12).add(0.08)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.022
    this.iridescence = 1
    this.iridescenceIOR = 1.82
    this.iridescenceThicknessNode = cuticle.mul(220).add(360)
    this.colorNode = mix(color('#1a0f03'), jewelColor, cuticle.mul(0.4).add(0.6))
    this.emissiveNode = structuralColor.mul(facetEdges).mul(near.mul(0.65).add(0.35)).mul(0.7).add(jewelColor.mul(rim.abs().pow(2)).mul(0.38)).add(color('#fde047').mul(facing.pow(8)).mul(near).mul(0.25))
  }
}
