import type {Texture} from 'three/webgpu'

import {color, mix, mx_cell_noise_float, mx_noise_float, mx_worley_noise_float, time, vec3} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import viewerFrame, {liquidNormal, opticalLine} from '../../helpers.ts'
import knotData from './data.ts'

export default class AbyssalBloomMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, rim, near} = viewerFrame()
    const pulse = time.mul(1.1).add(mx_noise_float(p.mul(1.8)).mul(2)).sin().mul(0.5).add(0.5)
    const veins = opticalLine(mx_worley_noise_float(p.mul(3.5).add(vec3(0, time.mul(0.12), 0))).sub(0.3), 0.012)
    const dots = mx_cell_noise_float(p.mul(28)).smoothstep(0.93, 0.97).mul(pulse)
    const glowColor = mix(color('#00ffcc'), color('#ff007f'), mx_noise_float(p.mul(1.2)).mul(0.5).add(0.5))
    this.colorNode = color('#04121f')
    this.transmission = 0.88
    this.thickness = 1.4
    this.ior = 1.34
    this.attenuationColor.set('#005f73')
    this.attenuationDistance = 0.7
    this.roughness = 0.18
    this.metalness = 0
    this.clearcoat = 1
    this.clearcoatRoughness = 0.06
    this.normalNode = liquidNormal(near, 0.28)
    this.emissiveNode = glowColor.mul(veins.mul(1.4).add(dots.mul(2.2))).mul(near.mul(0.9).add(0.35)).add(color('#66ffff').mul(rim).mul(0.45))
  }
}
