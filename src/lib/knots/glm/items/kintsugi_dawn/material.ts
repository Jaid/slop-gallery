import type {Texture} from 'three/webgpu'

import {cameraPosition, color, mix, modelWorldMatrixInverse, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, vec4} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import {fbm, opticalLine, proceduralNormal, starGlints} from '../../helpers.ts'
import knotData from './data.ts'

export default class KintsugiDawnMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const p = positionGeometry
    const view = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(p).normalize()
    const grazing = normalViewGeometry.dot(positionViewDirection).abs().clamp().oneMinus()
    const rim = grazing.pow(2)
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const clay = fbm(p.mul(5.5), 2)
    const crackField = fbm(p.mul(2.6)).sub(0.05)
    const veins = opticalLine(crackField, 0.05)
    const veinsWide = opticalLine(crackField, 0.13)
    const fineVeins = opticalLine(fbm(p.mul(7.2)).sub(0.05), 0.04).mul(near)
    const gold = veins.max(fineVeins)
    const dust = starGlints(p.mul(150), view, 16).mul(veinsWide).mul(near)
    const breath = time.mul(0.07).sin().mul(0.5).add(0.5)
    const clayMix = clay.mul(0.5).add(0.5)
    const speck = mx_noise_float(p.mul(72)).mul(0.5).add(0.5).smoothstep(0.72, 0.95).mul(0.55)
    const clayColor = mix(mix(color('#191319'), color('#282024'), clayMix), color('#3d353a'), speck)
    this.colorNode = mix(clayColor.add(color('#33150a').mul(veinsWide).mul(0.4)), color('#f6c25e'), gold)
    this.metalnessNode = gold.mul(0.97)
    this.roughnessNode = gold.oneMinus().mul(0.38).add(0.22).add(mx_noise_float(p.mul(60)).mul(0.04))
    this.iridescence = 0.2
    this.iridescenceIOR = 1.3
    this.iridescenceNode = gold.mul(0.25)
    this.clearcoat = 0.06
    this.envMapIntensity = 1.25
    this.normalNode = proceduralNormal(veinsWide.mul(0.8).add(fineVeins.mul(0.5)).add(mx_noise_float(p.mul(34)).mul(0.2)), 0.0019)
    this.emissiveNode = color('#ffca7a').mul(dust).mul(1.5)
      .add(color('#ff9d55').mul(veins).mul(rim).mul(breath).mul(near.mul(0.4).add(0.3)).mul(0.85))
  }
}
