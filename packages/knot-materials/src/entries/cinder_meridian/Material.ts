import type {Texture} from 'three/webgpu'

import {color, mix, mx_fractal_noise_float, mx_noise_float, uv} from 'three/tsl'

import {heartbeat} from '../../candidates/grok/lib/heartbeat.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalLine} from '../../lib/opticalLine.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, grazing, rim, near, intimate} = viewerFrame()
    const tube = uv()
    const breath = heartbeat()
    const wind = near.mul(0.55).add(0.45).mul(breath)
    const crust = mx_fractal_noise_float(p.mul(7.5), 4, 2, 0.5)
    const ash = mx_noise_float(p.mul(22))
    const meridian = opticalLine(tube.x.mul(18).add(tube.y.mul(Math.PI * 2).sin().mul(0.35)).add(crust.mul(0.4)).sin(), 0.045)
    const meridianFine = opticalLine(tube.x.mul(48).add(ash.mul(1.2)).sin(), 0.03).mul(intimate)
    const cracks = opticalLine(crust.mul(7).add(p.y.mul(2)), 0.05)
    const micro = opticalLine(mx_noise_float(p.mul(40)).mul(6), 0.035).mul(intimate)
    const fissure = meridian.max(cracks).add(meridianFine.mul(0.75)).add(micro.mul(0.4)).clamp()
    const emberCore = fissure.pow(1.6).mul(wind)
    const heat = mix(color('#3a0700'), mix(color('#ff3a00'), color('#ffe7a0'), emberCore.pow(2)), emberCore)
    const scale = crust.smoothstep(-0.2, 0.55)
    this.envMapIntensity = 0.22
    this.colorNode = mix(color('#070504'), mix(color('#2a1a12'), color('#120a08'), ash), scale)
    this.metalnessNode = fissure.mul(0.12)
    this.roughnessNode = scale.mul(0.35).add(0.48).sub(fissure.mul(0.28))
    this.clearcoat = 0.15
    this.clearcoatRoughness = 0.4
    this.normalNode = proceduralNormal(crust.mul(0.7).add(ash.mul(0.3)).add(fissure.mul(0.4)), 0.018)
    this.emissiveNode = heat
      .mul(emberCore)
      .mul(1.8)
      .mul(near.mul(0.7).add(0.45))
      .add(color('#ff8a3a').mul(grazing.pow(3)).mul(fissure).mul(0.25))
      .add(color('#4a1208').mul(rim).mul(0.12))
      .add(color('#fff4c8').mul(micro).mul(wind).mul(intimate).mul(0.8))
  }
}
