import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, time, uv, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

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
    const cr = cellNoiseVec3(cq)
    const cr2 = cellNoiseVec3(cq.add(vec3(17.3, 5.9, 41.2)))
    const cdist = cq.fract().sub(cr.mul(0.5).add(0.25)).length()
    const cfoot = cq.fwidth().length().max(0.001)
    const wave = tube.x.mul(Math.PI * 2 * 3).sub(time.mul(1.4)).add(cr2.z.mul(1.5)).sin().mul(0.5).add(0.5)
    const arousal = facing.pow(1.4).mul(near.mul(0.7).add(0.3))
    const radius = arousal.mul(wave.mul(0.5).add(0.5)).mul(0.32).add(0.04).mul(cr2.x.mul(0.5).add(0.75))
    const chroma = cdist.smoothstep(radius.sub(cfoot), radius.add(cfoot.mul(0.6))).oneMinus().mul(cfoot.smoothstep(0.35, 1.2).oneMinus())
    const pigment = mix(mix(color('#d8213f'), color('#ff8a1f'), cr.y), color('#6b1030'), cr2.y.mul(0.5))
    const pq = p.mul(11).add(vec3(3.7, 1.1, 9.4))
    const pr = cellNoiseVec3(pq)
    const pr2 = cellNoiseVec3(pq.add(vec3(7.7, 23.1, 3.3)))
    const pdist = pq.fract().sub(pr.mul(0.6).add(0.2)).length()
    const pfoot = pq.fwidth().length().max(0.001)
    const present = pr2.x.smoothstep(0.55, 0.6)
    const photophore = pdist.smoothstep(0.045, pfoot.mul(0.8).add(0.07)).oneMinus().mul(present)
    const sweep = tube.x.mul(Math.PI * 2 * 2).sub(time.mul(0.9)).sin().mul(0.5).add(0.5).pow(10)
    const twinkle = time.mul(pr2.y.mul(3).add(1)).add(pr2.z.mul(20)).sin().mul(0.5).add(0.5)
    const glowGate = sweep.mul(1.2).add(twinkle.mul(0.25)).add(intimate.mul(0.5))
    const bioColor = mix(color('#2fe8ff'), color('#b8fff1'), pr2.z)
    const eyeshine = photophore.mul(facing.pow(10)).mul(near)
    const halo = pdist.smoothstep(0, 0.35).oneMinus().mul(present).mul(glowGate)
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
    this.emissiveNode = bioColor.mul(photophore).mul(glowGate).mul(1.8)
      .add(bioColor.mul(halo).mul(0.35))
      .add(color('#ffffff').mul(eyeshine).mul(2.5))
      .add(color('#3a1a8a').mul(rim).mul(0.18))
      .add(pigment.mul(chroma).mul(intimate).mul(0.08))
  }
}
