import type {Texture} from 'three/webgpu'
import {color, mix, mx_fractal_noise_float, mx_noise_float, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time} from 'three/tsl'
import {proceduralNormal, spectralColor} from '#src/lib/knots/shared.ts'
import KnotMaterial from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

export default class NacreLatticeMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.95)
    this.name = knotData.id
    const p = positionGeometry
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const rim = grazing.pow(2)
    const near = positionView.length().smoothstep(1.25, 5.5).oneMinus()
    const nacre = mx_fractal_noise_float(p.mul(3), 3, 2, 0.5).mul(0.5).add(0.5)
    this.colorNode = mix(color('#f4f1e8'), color('#d7e3e6'), nacre)
    this.transmission = 0.68
    this.thickness = 0.42
    this.ior = 1.52
    this.attenuationColor.set('#f6f1e2')
    this.attenuationDistance = 0.55
    this.roughness = 0.1
    this.metalness = 0
    this.clearcoat = 0.8
    this.clearcoatRoughness = 0.06
    this.iridescence = 1
    this.iridescenceIOR = 1.38
    this.iridescenceThicknessNode = nacre.mul(460).add(160)
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(9)), 0.001)
    this.emissiveNode = spectralColor(nacre.mul(6).add(time.mul(0.04))).mul(0.18).mul(near.mul(0.6).add(0.4)).add(color('#ffffff').mul(rim).mul(0.1))
  }
}
