import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, time, uv, vec2, vec3} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import {bell, cellNoiseVec3, opticalLine, proceduralNormal, viewerFrame} from '../../flashHelpers.ts'
import knotData from './data.ts'

export default class MorphoVeilMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, facing, near} = viewerFrame()
    const far = near.oneMinus()
    const tube = uv()
    const rowF = tube.y.mul(160)
    const row = rowF.floor()
    const rowShift = cellNoiseVec3(vec3(row.add(0.5), 3.3, 7.7)).x.mul(0.35)
    const colF = tube.x.mul(120).add(rowShift)
    const col = colF.floor()
    const rnd = cellNoiseVec3(vec3(col.add(0.5), row.add(0.5), 3.3))
    const cf = vec2(colF.fract().sub(0.5), rowF.fract().sub(0.5))
    const foot = cf.x.fwidth().add(cf.y.fwidth()).mul(0.75).max(0.002)
    const dScale = cf.mul(vec2(1, 0.7)).length()
    const scaleMask = dScale.smoothstep(0.35, foot.add(0.38)).oneMinus()
    const vein = opticalLine(rowF.mul(0.0625).fract().sub(0.5), 0.03)
    const crossVein = opticalLine(colF.mul(0.05).fract().sub(0.5), 0.014).mul(0.5)
    const veinField = vein.max(crossVein)
    const flashBase = bell(facing, 0.42, 14).add(bell(facing, 0.75, 26).mul(0.55))
    const twinkle = time.mul(1.3).add(rnd.x.mul(6.283)).sin().mul(0.15).add(0.85)
    const scaleFlash = flashBase.mul(rnd.y.mul(0.6).add(0.7)).mul(twinkle)
    const blue = mix(color('#1b2fd8'), color('#5fe9ff'), facing.mul(0.75).add(rnd.x.mul(0.25)))
    const membrane = mix(color('#170b1c'), color('#2c1440'), mx_noise_float(p.mul(3.5)).mul(0.5).add(0.5))
    const scaleCol = mix(membrane, blue.mul(0.3).add(color('#241033')), scaleMask)
    this.colorNode = mix(scaleCol, color('#080410'), veinField)
    this.metalness = 0.4
    this.roughnessNode = float(0.3).mix(0.45, veinField)
    this.clearcoat = 0.3
    this.clearcoatRoughness = 0.22
    this.sheen = 0.55
    this.sheenColor.set('#2a4bff')
    this.sheenRoughness = 0.45
    this.normalNode = proceduralNormal(dScale.negate().mul(0.8).add(mx_noise_float(p.mul(40)).mul(0.08)), 0.0016)
    this.emissiveNode = blue.mul(scaleMask).mul(scaleFlash).mul(near.mul(0.5).add(0.55)).mul(1.7)
      .add(blue.mul(flashBase).mul(far).mul(0.22))
      .add(color('#6a2a8f').mul(facing.oneMinus().pow(2)).mul(0.3))
  }
}
