import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec4} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {opticalBands, opticalLine, spectralColor} from '../../helpers.ts'
import knotData from './data.ts'

export default class QuantumSuperconductorMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    this.envMapIntensity = 1.1
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.abs().pow(2)
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const intimate = positionView.length().smoothstep(0.8, 2.7).oneMinus()
    const uL = p.x.mul(26).add(p.z.mul(15))
    const vL = p.z.mul(30).sub(p.x.mul(5))
    const vortexDist = uL.sin().abs().pow(2).add(vL.sin().abs().pow(2)).sqrt()
    const vortexCore = opticalLine(vortexDist.sub(0.15), 0.045)
    const supercurrent = opticalBands(vortexDist.mul(14).sub(time.mul(0.7)))
    const deep = p.sub(view.mul(0.2))
    const pinnedFilament = opticalLine(mx_noise_float(deep.mul(20)).sub(0.2), 0.03).mul(intimate)
    const quantumHalo = spectralColor(vortexDist.mul(6).add(view.x.mul(4)).add(1.8))
    this.colorNode = mix(color('#121528'), color('#252b48'), facing.mul(0.4).add(0.1))
    this.metalness = 0.94
    this.roughness = 0.07
    this.clearcoat = 0.85
    this.clearcoatRoughness = 0.025
    this.anisotropy = 0.95
    this.anisotropyRotation = 0.25
    this.emissiveNode = color('#c084fc').mul(vortexCore).mul(near.mul(0.7).add(0.4)).mul(1.3).add(color('#38bdf8').mul(supercurrent).mul(vortexCore.oneMinus()).mul(near).mul(0.45)).add(quantumHalo.mul(pinnedFilament).mul(0.9)).add(color('#a78bfa').mul(rim.abs().pow(2)).mul(0.35))
  }
}
