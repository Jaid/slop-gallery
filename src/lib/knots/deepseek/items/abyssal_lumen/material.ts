import type {Texture} from 'three/webgpu'

import {color, mix, mx_cell_noise_float, mx_fractal_noise_float, mx_noise_float, time, vec3} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {liquidNormal, opticalLine, viewerFrame} from '../../flashHelpers.ts'
import knotData from './data.ts'

export default class AbyssalLumenMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    this.envMapIntensity = 0.7
    const {p, facing, rim, near, intimate} = viewerFrame()
    const drift = vec3(time.mul(0.02), time.mul(0.015), time.mul(-0.01))
    const bodyNoise = mx_fractal_noise_float(p.mul(5).add(drift), 3, 2, 0.5)
    const veinField = mx_noise_float(p.mul(18).add(bodyNoise.mul(2)).sub(drift.mul(2)))
    const vein = opticalLine(veinField.mul(24).sin(), 0.025)
    const spots = mx_cell_noise_float(p.mul(30).add(time.mul(0.03))).smoothstep(0.86, 0.9)
    const pulse = time.mul(0.8).add(bodyNoise.mul(4)).sin().mul(0.5).add(0.5)
    const flesh = mix(color('#021014'), color('#0f4a4a'), bodyNoise.mul(0.5).add(0.5))
    this.colorNode = flesh
    this.transmission = 0.6
    this.thickness = 0.5
    this.ior = 1.38
    this.attenuationColor.set('#0b3b3b')
    this.attenuationDistance = 0.6
    this.roughness = 0.15
    this.clearcoat = 0.9
    this.clearcoatRoughness = 0.1
    this.normalNode = liquidNormal(near, 0.15)
    this.emissiveNode = mix(color('#19f7d2'), color('#b8fff2'), pulse).mul(vein).mul(1.8).mul(near.mul(0.5).add(0.5)).add(color('#ff4fd8').mul(spots).mul(pulse).mul(intimate.mul(0.8).add(0.3))).add(color('#4dffff').mul(rim).mul(0.2)).add(color('#19f7d2').mul(facing).mul(0.05))
  }
}
