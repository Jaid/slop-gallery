import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec4} from 'three/tsl'

import {liquidNormal, opticalBands, opticalLine, spectralColor} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class QuantumFoamMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const deep = p.sub(view.mul(0.28))
    const waveA = p.mul(15).add(time.mul(0.5)).sin()
    const waveB = deep.mul(22).sub(time.mul(0.3)).cos()
    const interference = waveA.dot(waveB)
    const probabilityBands = opticalBands(interference.mul(4))
    const nodes = opticalLine(interference, 0.03)
    this.colorNode = mix(color('#081026'), color('#193266'), probabilityBands)
    this.transmission = 0.65
    this.thickness = 0.35
    this.ior = 1.42
    this.dispersion = 0.5
    this.roughness = 0.04
    this.clearcoat = 1
    this.clearcoatRoughness = 0.02
    this.normalNode = liquidNormal(near, 0.12)
    this.emissiveNode = spectralColor(interference.add(time.mul(0.2))).mul(nodes).mul(near.mul(0.8).add(0.2)).add(color('#4788ff').mul(probabilityBands).mul(grazing).mul(0.4))
  }
}
