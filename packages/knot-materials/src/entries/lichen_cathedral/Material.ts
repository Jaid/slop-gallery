import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_cell_noise_float, mx_fractal_noise_float, mx_noise_float, mx_worley_noise_float, normalLocal, positionLocal, time} from 'three/tsl'

import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    // Ancient granite breathing with bioluminescent lichen - hyper detail up close
    const {p, rim, near} = viewerFrame()
    const stoneNoise = mx_fractal_noise_float(p.mul(1.8), 3, 2, 0.55)
    const stoneColor = mix(color('#2a2e2d'), color('#3d4440'), stoneNoise.mul(0.5).add(0.5))
    const worley = mx_worley_noise_float(p.mul(6.2))
    const shelterMask = worley.oneMinus().smoothstep(0.35, 0.75)
    const lichenNoise = mx_noise_float(p.mul(4.5))
    const lichenBaseMask = lichenNoise.smoothstep(0.25, 0.65).mul(shelterMask)
    const detailLichen = mx_noise_float(p.mul(22)).mul(lichenBaseMask)
    const breath = time.mul(0.35).sin().mul(0.15).add(0.85)
    const lichenTint1 = color('#2aff7a')
    const lichenTint2 = color('#a0ff66')
    const fruiting = color('#ffe066')
    const lichenColor = mix(lichenTint1, lichenTint2, mx_noise_float(p.mul(8)).mul(0.5).add(0.5))
    const fruitMask = mx_cell_noise_float(p.mul(28)).smoothstep(0.88, 0.93).mul(lichenBaseMask)
    this.positionNode = positionLocal.add(normalLocal.mul(lichenBaseMask.mul(0.025).mul(near).mul(detailLichen.mul(0.5).add(0.5))))
    this.colorNode = mix(stoneColor, lichenColor, lichenBaseMask.mul(0.85)).add(fruiting.mul(fruitMask).mul(0.6))
    this.roughnessNode = float(0.85).sub(lichenBaseMask.mul(0.45)).add(detailLichen.mul(0.1))
    this.metalness = 0
    this.clearcoat = 0.1
    this.clearcoatRoughness = 0.8
    this.normalNode = proceduralNormal(stoneNoise.mul(0.5).add(detailLichen.mul(lichenBaseMask).mul(0.8)), 0.0012)
    this.emissiveNode = lichenColor.mul(lichenBaseMask).mul(breath).mul(0.35)
      .add(fruiting.mul(fruitMask).mul(breath).mul(0.9))
      .add(lichenTint1.mul(rim.pow(2).mul(lichenBaseMask).mul(0.18)))
      .mul(near.mul(0.6).add(0.4))
    this.envMapIntensity = 0.4
  }
}
