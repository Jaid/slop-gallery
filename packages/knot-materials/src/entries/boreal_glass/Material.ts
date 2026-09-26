import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalLocal, time, vec3} from 'three/tsl'

import {filteredRibbon} from '../../lib/filteredRibbon.ts'
import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** Black ice, with two crossing auroras. A curtain flares only while the eye looks along it, and the other family waits in the dark. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.85)
    this.name = knotData.id
    const {p, view, facing, grazing, near, objectDistance} = viewerFrame()
    const proximity = objectDistance.smoothstep(1.5, 4.6).oneMinus()
    const drift = time.mul(0.36)
    const warp = mx_noise_float(p.mul(1.2).add(vec3(drift.mul(0.2), drift, drift.mul(-0.12))))
    const bandX = p.x.mul(3.1).add(p.y.mul(0.7)).add(warp.mul(1.25))
    const bandZ = p.z.mul(2.7).sub(p.y.mul(0.55)).add(warp.mul(1.15)).add(drift.mul(0.5))
    const veilX = bandX.sin().abs().smoothstep(0.72, 0.98)
    const veilZ = bandZ.sin().abs().smoothstep(0.76, 0.99)
    const edgeX = view.x.abs().oneMinus()
    const edgeZ = view.z.abs().oneMinus()
    const flutter = p.y.mul(8).sub(time.mul(0.9)).add(warp.mul(2)).sin().mul(0.28).add(0.72)
    const curtainX = veilX.mul(edgeX.mul(0.9).add(0.06)).mul(flutter)
    const curtainZ = veilZ.mul(edgeZ.mul(0.9).add(0.06)).mul(flutter.mul(0.9).add(0.1))
    const spine = filteredRibbon(bandX.sin(), 0.14).mul(edgeX).add(filteredRibbon(bandZ.sin(), 0.14).mul(edgeZ))
    const height = p.y.smoothstep(-0.5, 0.58)
    const warm = mix(color('#39ff9a'), color('#ff4bd2'), height)
    const cool = mix(color('#6ef6ff'), color('#7a62ff'), height)
    const aurora = mix(warm, cool, curtainZ.div(curtainX.add(curtainZ).add(0.001)).clamp(0, 1))
    const frostNoise = mx_noise_float(p.mul(16)).mul(0.5).add(0.5)
    const frost = frostNoise.smoothstep(0.62, 0.94).mul(grazing.mul(0.8).add(0.05)).mul(proximity.mul(0.9).add(0.12))
    const ice = mix(color('#03070c'), color('#102838'), facing.pow(0.8).mul(0.7))
    this.colorNode = mix(ice, color('#d8f6ff'), frost.mul(0.28))
    this.metalness = 0.02
    this.roughnessNode = float(0.045).add(frost.mul(0.4)).clamp(0.03, 0.5)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.028
    this.ior = 1.31
    const iceNormal = proceduralNormal(warp.mul(0.4).add(frostNoise.mul(frost)), 0.018)
    this.normalNode = iceNormal
    const spark = glints(iceNormal, 64).mul(frost).mul(near).mul(0.7)
    this.emissiveNode = aurora.mul(curtainX.add(curtainZ)).mul(1.25)
      .add(color('#f4fbff').mul(spine).mul(1.15))
      .add(color('#eafbff').mul(spark))
      .add(color('#c5f3ff').mul(frost).mul(0.16))
    this.positionNode = p.add(normalLocal.mul(warp.mul(0.005)))
  }
}
