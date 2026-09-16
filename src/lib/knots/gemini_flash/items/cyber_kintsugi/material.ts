import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import {opticalLine, proceduralNormal} from '../../helpers.ts'
import knotData from './data.ts'

export default class CyberKintsugiMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    this.envMapIntensity = 1.15
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.abs().pow(2)
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const intimate = positionView.length().smoothstep(0.8, 2.7).oneMinus()
    const crackNoise = mx_noise_float(p.mul(8.5)).mul(0.42)
    const crackFine = mx_noise_float(p.mul(22)).mul(0.18)
    const crackField = p.x.mul(7.5).add(p.y.mul(8.2)).sin().add(p.z.mul(6.8).cos()).add(crackNoise).add(crackFine)
    const crackMask = opticalLine(crackField, 0.058)
    const crackCore = opticalLine(crackField, 0.022)
    const flowPhase = p.dot(vec3(14, 18, 12)).sub(time.mul(3.2))
    const logicPulse = flowPhase.sin().abs().pow(24).mul(crackCore)
    const sapphireData = flowPhase.add(2).sin().abs().pow(28).mul(crackCore)
    this.colorNode = mix(color('#f8f9fa'), color('#ffc83b'), crackMask)
    this.metalnessNode = mix(float(0.03), float(0.98), crackMask)
    this.roughnessNode = mix(float(0.22), float(0.025), crackMask)
    this.clearcoat = 0.92
    this.clearcoatRoughness = 0.035
    this.anisotropy = 0.9
    this.anisotropyRotation = 0.4
    this.normalNode = proceduralNormal(crackField.mul(intimate), 0.0018)
    this.emissiveNode = color('#ffd700').mul(crackMask).mul(near.mul(0.4).add(0.2)).mul(0.5).add(color('#fffbeb').mul(logicPulse).mul(near.mul(0.7).add(0.5)).mul(1.8)).add(color('#38bdf8').mul(sapphireData).mul(near.mul(0.7).add(0.5)).mul(2)).add(color('#fbbf24').mul(rim.pow(3)).mul(0.25))
  }
}
