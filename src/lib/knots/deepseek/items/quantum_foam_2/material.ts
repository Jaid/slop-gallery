import type {Texture} from 'three/webgpu'

import {color, mix, mx_cell_noise_float, mx_noise_float, time} from 'three/tsl'
import {DoubleSide} from 'three/webgpu'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import {viewerFrame} from '../../flashHelpers.ts'
import knotData from './data.ts'

export default class QuantumFoam2Material extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    this.envMapIntensity = 0.3
    this.alphaHash = true
    this.side = DoubleSide
    const {p, view, rim, near, intimate} = viewerFrame()
    const phase = p.dot(view).mul(18).add(time.mul(1.7))
    const interference = phase.sin().mul(phase.mul(0.7).add(view.x.mul(4)).cos()).abs()
    const collapse = mx_cell_noise_float(p.mul(26).add(view.mul(3)).add(time.mul(0.5))).smoothstep(0.75, 0.8)
    const voidNoise = mx_noise_float(p.mul(9).sub(time.mul(0.2)))
    const probability = interference.mul(0.6).add(collapse.mul(0.8)).add(voidNoise.mul(0.2)).clamp()
    const quantum = mix(color('#1a0033'), color('#b18cff'), probability).add(color('#00f5ff').mul(collapse).mul(0.8))
    this.colorNode = color('#05000a')
    this.roughness = 0.05
    this.metalness = 0.2
    this.clearcoat = 1
    this.clearcoatRoughness = 0.02
    this.iridescence = 0.8
    this.iridescenceIOR = 1.6
    this.iridescenceThicknessNode = probability.mul(300).add(100)
    this.emissiveNode = quantum.mul(probability).mul(near.mul(0.6).add(0.4)).add(color('#ff4fd8').mul(collapse).mul(intimate).mul(0.6)).add(color('#8cf5ff').mul(rim).mul(0.4))
    this.opacityNode = probability.mul(0.55).add(collapse.mul(0.3)).add(intimate.mul(0.15)).clamp()
  }
}
