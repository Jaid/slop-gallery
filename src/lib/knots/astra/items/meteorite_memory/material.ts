import type {Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, positionGeometry, vec2, vec3} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {premiumBands, premiumDetail, premiumHash, premiumIntimate, premiumLine, premiumNormal, premiumView} from '../../helpers.ts'
import knotData from './data.ts'

export default class MeteoriteMemoryMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.95)
    this.name = knotData.id
    const p = positionGeometry
    const view = premiumView()
    const detail = premiumDetail()
    const intimate = premiumIntimate()
    const a = p.dot(vec3(39, 11, -24))
    const b = p.dot(vec3(-19, 37, 22))
    const c = p.dot(vec3(17, -28, 43))
    const idA = a.div(Math.PI).floor()
    const idB = b.div(Math.PI).floor()
    const idC = c.div(Math.PI).floor()
    const crystal = premiumHash(idA.mul(0.73).add(idB.mul(19.1)).add(idC.mul(3.17)))
    const crystalB = premiumHash(idA.mul(2.37).sub(idB.mul(7.3)).add(idC.mul(23.9)))
    const edgeA = premiumLine(a.sin(), 0.048)
    const edgeB = premiumLine(b.sin(), 0.048)
    const edgeC = premiumLine(c.sin(), 0.035)
    const boundaries = edgeA.max(edgeB).max(edgeC.mul(0.65))
    const orientation = crystal.mul(Math.PI)
    this.anisotropyNode = vec2(orientation.cos(), orientation.sin()).mul(crystalB.mul(0.25).add(0.57))
    const silverFlash = view.dot(vec3(0.71, 0.25, -0.66).normalize()).abs().pow(16).mul(crystal.smoothstep(0.35, 0.8))
    const bronzeFlash = view.dot(vec3(-0.25, 0.91, 0.33).normalize()).abs().pow(18).mul(crystal.oneMinus().smoothstep(0.3, 0.75))
    const alloy = mix(color('#343d46'), color('#a5aeb4'), crystal.mul(0.42).add(0.24))
    const litAlloy = mix(alloy, color('#d9e7e9'), silverFlash.mul(0.72))
    const tempered = mix(litAlloy, color('#a28660'), bronzeFlash.mul(0.4))
    this.colorNode = mix(tempered, color('#151d23'), boundaries.mul(0.72))
    this.metalness = 1
    this.roughnessNode = crystalB.mul(0.18).add(0.2).add(boundaries.mul(0.15))
    const brushing = premiumBands(p.dot(vec3(310, 94, -191)).add(mx_noise_float(p.mul(12)).mul(0.6))).mul(intimate)
    this.normalNode = premiumNormal(boundaries.mul(-0.7).add(brushing.mul(0.11)).mul(detail), 0.0005)
    this.clearcoat = 0.22
    this.clearcoatRoughness = 0.18
    this.envMapIntensity = 1.25
  }
}
