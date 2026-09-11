import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import {fbm, heartbeat, opticalLine, proceduralNormal, starGlints} from '../../helpers.ts'
import knotData from './data.ts'

export default class EmberheartMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const grazing = normalViewGeometry.dot(positionViewDirection).abs().clamp().oneMinus()
    const rim = grazing.pow(2)
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const pulse = heartbeat(0.82)
    const swell = pulse.mul(0.65).add(0.7)
    const crust = fbm(p.mul(3.1))
    const crackField = crust.sub(0.08)
    const cracks = opticalLine(crackField, 0.045)
    const cracksWide = opticalLine(crackField, 0.11)
    const inner = p.sub(view.mul(0.15))
    const deepField = fbm(inner.mul(4.4).add(vec3(0, time.mul(0.05), 0))).sub(0.15)
    const deepCracks = opticalLine(deepField, 0.05).mul(near)
    const embers = starGlints(p.mul(120), view, 20).mul(cracksWide)
    const heat = pulse.mul(0.6).add(0.4).mul(near.mul(0.9).add(0.55))
    this.colorNode = mix(color('#151009'), color('#33231a'), crust.mul(0.5).add(0.5)).add(color('#40130a').mul(cracksWide))
    this.transmission = 0.42
    this.thickness = 0.55
    this.ior = 1.5
    this.dispersion = 0.12
    this.attenuationColor.set('#2e0c02')
    this.attenuationDistance = 0.5
    this.roughnessNode = cracks.mul(-0.3).add(0.52).max(0.18)
    this.clearcoat = 0.3
    this.clearcoatRoughness = 0.22
    this.envMapIntensity = 0.85
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(9)).mul(swell).add(crust.mul(0.35)), 0.000_42)
    this.emissiveNode = color('#c81601').mul(cracksWide).mul(0.55)
      .add(color('#ff5e12').mul(cracks).mul(1.25))
      .add(color('#ffd9a0').mul(deepCracks).mul(2.1))
      .mul(heat)
      .add(color('#ffc07a').mul(embers).mul(heat).mul(0.9))
      .add(color('#ff7a30').mul(rim).mul(pulse).mul(0.5))
  }
}
