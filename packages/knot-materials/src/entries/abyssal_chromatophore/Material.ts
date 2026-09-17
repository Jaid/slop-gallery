import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, time, uv, vec3} from 'three/tsl'

import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {photophoreCells, pigmentCells} from './util.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    // Deep-sea skin. Velvet-black with pigment cells that dilate toward whoever is looking and blush
    // in waves along the body; photophores flash in a travelling sweep, and when you stare straight
    // at it, the photophores stare back.
    const {p, facing, grazing, rim, near, intimate} = viewerFrame()
    const tube = uv()
    const skinNoise = mx_noise_float(p.mul(18))
    const cq = p.mul(26).add(skinNoise.mul(0.15))
    const phase = tube.x.mul(Math.PI * 2 * 3).sub(time.mul(1.4))
    const arousal = facing.pow(1.4).mul(near.mul(0.7).add(0.3))
    const cells = pigmentCells(cq, phase, arousal).toVar()
    const pigment = cells.rgb
    const chroma = cells.a
    const pq = p.mul(11).add(vec3(3.7, 1.1, 9.4))
    const sweep = tube.x.mul(Math.PI * 2 * 2).sub(time.mul(0.9)).sin().mul(0.5).add(0.5).pow(10)
    const lights = photophoreCells(pq, sweep, intimate).toVar()
    const photophore = lights.a
    const eyeshine = photophore.mul(facing.pow(10)).mul(near)
    this.colorNode = mix(color('#070310'), pigment, chroma.mul(0.9))
    this.metalness = 0
    this.roughnessNode = float(0.55).mix(0.3, chroma)
    this.sheen = 1
    this.sheenNode = mix(color('#5a3fbf'), color('#ff6aa8'), grazing).mul(0.75)
    this.sheenRoughnessNode = float(0.6)
    this.clearcoatNode = float(0.6).add(photophore.mul(0.4))
    this.clearcoatRoughness = 0.12
    this.retroreflectivity = 0.5
    this.retroreflectivityNode = photophore.mul(0.9)
    this.normalNode = proceduralNormal(chroma.mul(0.7).add(photophore.mul(1.2)).add(skinNoise.mul(0.12)), 0.0011)
    this.emissiveNode = lights.rgb
      .add(color('#ffffff').mul(eyeshine).mul(2.5))
      .add(color('#3a1a8a').mul(rim).mul(0.18))
      .add(pigment.mul(chroma).mul(intimate).mul(0.08))
  }
}
