import type {Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, normalViewGeometry, positionGeometry, positionViewDirection, vec3} from 'three/tsl'
import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'
import {premiumLine, premiumNormal, premiumView, premiumDetail, premiumIntimate, glacierField} from '../../helpers.ts'
export default class GlacialMemoryMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.95)
    this.name = knotData.id
    const p = positionGeometry
    const view = premiumView()
    const detail = premiumDetail()
    const intimate = premiumIntimate()
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const frontField = glacierField(p)
    const middleField = glacierField(p.sub(view.mul(0.12)))
    const deepField = glacierField(p.sub(view.mul(0.29)))
    const surfaceCracks = premiumLine(frontField, 0.026)
    const middleCracks = premiumLine(middleField, 0.018)
    const deepCracks = premiumLine(deepField, 0.013)
    const weather = mx_noise_float(p.mul(6.5)).mul(0.5).add(0.5)
    const frost = weather.smoothstep(0.59, 0.77)
    const crystalGrain = mx_noise_float(p.mul(95)).mul(0.5).add(0.5)
    const fractureFlash = view.dot(vec3(-0.36, 0.81, 0.46).normalize()).abs().pow(22)
    const fractureFlash2 = view.dot(vec3(0.84, 0.18, -0.51).normalize()).abs().pow(28)
    const ice = mix(color('#b1deea'), color('#edfaff'), weather.mul(0.4).add(0.4))
    const cloudyIce = mix(ice, color('#f2f8f7'), frost.mul(0.88))
    this.colorNode = mix(cloudyIce, color('#477f99'), middleCracks.mul(detail).mul(0.16))
    this.transmission = 0.9
    this.transmissionNode = frost.mul(0.5).oneMinus().mul(0.92)
    this.thickness = 0.62
    this.ior = 1.31
    this.dispersion = 0.045
    this.attenuationColor.set('#a2d6e5')
    this.attenuationDistance = 1.4
    this.roughnessNode = frost.mul(0.32).add(surfaceCracks.mul(0.065)).add(0.048)
    this.clearcoat = 0.65
    this.clearcoatRoughnessNode = frost.mul(0.16).add(0.035)
    const relief = surfaceCracks.mul(-0.5).add(crystalGrain.mul(frost).mul(intimate).mul(0.17))
    this.normalNode = premiumNormal(relief.mul(detail), 0.00065)
    this.clearcoatNormalNode = premiumNormal(mx_noise_float(p.mul(11)), 0.00012)
    this.emissiveNode = color('#d4f8ff').mul(surfaceCracks).mul(fractureFlash.mul(0.8).add(0.07)).add(color('#8bc7e2').mul(middleCracks).mul(detail).mul(fractureFlash2.mul(0.5).add(0.13))).add(color('#438aaa').mul(deepCracks).mul(intimate).mul(0.19)).add(color('#cbefff').mul(grazing.pow(6)).mul(frost).mul(0.08))
    this.envMapIntensity = 0.95
  }
}
