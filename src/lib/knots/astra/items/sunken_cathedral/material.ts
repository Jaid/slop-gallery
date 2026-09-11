import type {Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, normalViewGeometry, positionGeometry, positionViewDirection, time, vec2, vec3} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {cathedralTracery, premiumDetail, premiumIntimate, premiumNormal, premiumView} from '../../helpers.ts'
import knotData from './data.ts'

export default class SunkenCathedralMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.95)
    this.name = knotData.id
    const p = positionGeometry
    const view = premiumView()
    const detail = premiumDetail()
    const intimate = premiumIntimate()
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const q0 = p.sub(view.mul(0.065))
    const q1 = p.sub(view.mul(0.16))
    const q2 = p.sub(view.mul(0.28))
    const q3 = p.sub(view.mul(0.41))
    const front = cathedralTracery(q0)
    const middle = cathedralTracery(q1.add(vec3(0.027, 0.014, 0)))
    const back = cathedralTracery(q2.add(vec3(0.054, 0.028, 0)))
    const sanctuary = cathedralTracery(q3.add(vec3(0.081, 0.042, 0)))
    // Perpendicular galleries give the illusion depth from multiple sides.
    const transept = cathedralTracery(vec3(q2.z, q2.y, q2.x).add(vec3(0.021, 0.065, 0)))
    const occlusion1 = front.mul(0.6).oneMinus()
    const occlusion2 = middle.mul(0.5).oneMinus()
    const lanternField = vec2(q3.x.mul(9).fract().sub(0.5), q3.y.mul(7).fract().sub(0.63)).length()
    const lanterns = lanternField.smoothstep(0.026, 0.105).oneMinus().mul(intimate.mul(0.65).add(0.35))
    const waterLight = q2.y.mul(15).add(q2.x.mul(11)).add(time.mul(0.22)).sin().mul(0.5).add(0.5)
    this.colorNode = mix(color('#102a3b'), color('#376176'), grazing.abs().pow(2).mul(0.45))
    this.transmission = 0.68
    this.thickness = 0.48
    this.ior = 1.57
    this.dispersion = 0.08
    this.attenuationColor.set('#477f91')
    this.attenuationDistance = 1.1
    this.roughness = 0.045
    this.clearcoat = 1
    this.clearcoatRoughness = 0.026
    this.normalNode = premiumNormal(mx_noise_float(p.mul(7)), 0.000_14)
    const architecture = color('#b1e5eb').mul(front).mul(0.33).add(color('#74c3d4').mul(middle).mul(occlusion1).mul(detail.mul(0.45).add(0.24))).add(color('#398aab').mul(back).mul(occlusion1).mul(occlusion2).mul(detail).mul(0.46)).add(color('#ddb879').mul(sanctuary).mul(intimate).mul(0.55)).add(color('#3b91a7').mul(transept).mul(detail).mul(0.19))
    this.emissiveNode = architecture.mul(facing.mul(0.3).add(0.7)).mul(waterLight.mul(0.13).add(0.87)).add(color('#ffe1a0').mul(lanterns).mul(0.85))
    this.envMapIntensity = 0.8
  }
}
