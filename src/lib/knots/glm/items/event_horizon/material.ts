import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec3, vec4} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {opticalLine, proceduralNormal, starGlints} from '../../helpers.ts'
import knotData from './data.ts'

export default class EventHorizonMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const grazing = normalViewGeometry.dot(positionViewDirection).abs().clamp().oneMinus()
    const rim = grazing.pow(2)
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const intimate = positionView.length().smoothstep(0.8, 2.7).oneMinus()
    const axis = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.normalize()
    const band = p.normalize().dot(axis)
    const photonCore = opticalLine(band, 0.016)
    const photon = opticalLine(band, 0.055)
    const corona = opticalLine(band, 0.16)
    const reference = mix(vec3(0.31, 1, 0.13), vec3(1, 0.27, 0.11), axis.y.abs().smoothstep(0.88, 0.97))
    const t1 = axis.cross(reference).normalize()
    const t2 = axis.cross(t1).normalize()
    const spin = time.mul(0.55)
    const orbit = p.dot(t1).mul(spin.cos()).add(p.dot(t2).mul(spin.sin()))
    const streaks = opticalLine(orbit.mul(6.5).add(mx_noise_float(p.mul(9)).mul(0.4)), 0.05).mul(corona)
    const beaming = p.dot(t1).mul(2.4).add(1.3).max(0.15).min(2.6)
    const inner = opticalLine(band.sub(0.3), 0.06).mul(intimate)
    const bodyStars = starGlints(p.mul(64), view, 24)
    const surge = near.mul(1.15).add(0.95)
    this.colorNode = mix(color('#020205'), color('#0b0d1c'), grazing)
    this.transmission = 0.5
    this.thickness = 0.9
    this.ior = 1.6
    this.dispersion = 0.3
    this.attenuationColor.set('#04050c')
    this.attenuationDistance = 0.42
    this.roughness = 0.05
    this.clearcoat = 1
    this.clearcoatRoughness = 0.045
    this.envMapIntensity = 1.15
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(17)).mul(corona), 0.000_22)
    this.emissiveNode = color('#fff8ec').mul(photonCore).mul(4.4)
      .add(color('#ffb257').mul(photon).mul(1.4))
      .add(color('#ff6a2a').mul(streaks).mul(0.9))
      .mul(beaming).mul(surge)
      .add(color('#8f6bff').mul(inner).mul(1.6))
      .add(color('#aebbff').mul(bodyStars).mul(near.mul(0.5).add(0.5)).mul(0.5))
      .add(color('#7c8ad8').mul(rim).mul(0.07))
  }
}
