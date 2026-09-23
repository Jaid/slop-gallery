import type {Node, Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, time, uv} from 'three/tsl'

import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalBands} from '../../lib/opticalBands.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

function blackbody(t: Node<'float'>) {
  const coal = mix(color('#140805'), color('#c21400'), t.pow(0.85))
  const flame = mix(color('#ff6a12'), color('#fff3d6'), t)
  return mix(coal, flame, t)
}

export default class extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, facing, grazing, rim, near, intimate} = viewerFrame()
    const tube = uv()
    // Whole turns close the coil at both UV wraps, including its shading derivatives.
    const coil = opticalBands(tube.x.mul(TAU * 27).add(tube.y.mul(TAU)))
    const travelling = tube.x.mul(Math.PI * 10).add(time.mul(0.62)).sin().mul(0.5).add(0.5).pow(1.8)
    const work = facing.mul(0.38).add(near.mul(0.4)).add(intimate.mul(0.34))
    const temperature = travelling.mul(work).mul(0.72).add(work.mul(0.28)).add(coil.mul(0.18)).clamp()
    const heat = blackbody(temperature)
    const coolMetal = mix(color('#121214'), color('#3a3d44'), grazing.mul(0.5).add(mx_noise_float(p.mul(9)).mul(0.12)))
    this.colorNode = mix(coolMetal, mix(color('#2a1208'), heat, temperature), temperature)
    this.metalnessNode = temperature.oneMinus().mul(0.45).add(0.5)
    this.roughnessNode = coil.mul(0.07).add(temperature.oneMinus().mul(0.28)).add(0.04)
    this.clearcoat = 0.15
    this.clearcoatRoughness = 0.4
    this.normalNode = proceduralNormal(coil.mul(0.45).add(mx_noise_float(p.mul(18)).mul(0.2)), 0.0022)
    this.emissiveNode = heat
      .mul(temperature.pow(1.6))
      .mul(1.85)
      .mul(near.mul(0.45).add(0.55))
      .add(color('#ff9a40').mul(coil).mul(temperature).mul(0.35))
      .add(color('#4a1808').mul(rim).mul(temperature.mul(0.2).add(0.08)))
    this.envMapIntensity = 0.55
  }
}
