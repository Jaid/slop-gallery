import type {Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, time, vec3} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import viewerFrame, {liquidNormal, opticalLine} from '../../helpers.ts'
import knotData from './data.ts'

export default class AuroraVeilMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, grazing, near} = viewerFrame()
    const drift = vec3(time.mul(0.05), time.mul(-0.03), time.mul(0.02))
    const field = mx_noise_float(p.mul(1.2).add(drift))
    const curtainPhase = p.y.mul(3.5).add(field.mul(6)).add(time.mul(0.4))
    const rays = opticalLine(curtainPhase.sin(), 0.035)
    const veil = curtainPhase.cos().mul(0.5).add(0.5).pow(4)
    const aurora = mix(color('#00ff9c'), color('#c86bff'), curtainPhase.sin().mul(0.5).add(0.5))
    const aurora2 = mix(aurora, color('#4dd0ff'), field.mul(0.5).add(0.5))
    this.colorNode = color('#02060d')
    this.transmission = 0.92
    this.thickness = 0.9
    this.ior = 1.08
    this.attenuationColor.set('#004d40')
    this.attenuationDistance = 0.6
    this.roughness = 0.04
    this.metalness = 0
    this.clearcoat = 1
    this.clearcoatRoughness = 0.04
    this.iridescence = 1
    this.iridescenceIOR = 1.15
    this.iridescenceThicknessNode = curtainPhase.mul(120).add(180)
    this.normalNode = liquidNormal(near, 0.14)
    this.emissiveNode = aurora2.mul(rays.mul(1.8).add(veil.mul(0.7))).mul(near.mul(0.8).add(0.35)).add(color('#a0f0ff').mul(grazing.pow(3)).mul(0.35))
  }
}
