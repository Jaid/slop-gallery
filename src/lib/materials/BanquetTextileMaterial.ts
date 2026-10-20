import {color, float, mix, mx_noise_float, positionGeometry} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

import {heightNormal} from './filters.ts'

/** Asset-free woven linen or velvet, with the thread relief filtered out before it becomes subpixel. */
export default class BanquetTextileMaterial extends MeshPhysicalNodeMaterial {
  constructor(tint: string, velvet = false) {
    super({
      roughness: velvet ? 0.92 : 0.86,
      sheen: velvet ? 0.65 : 0.15,
      sheenColor: tint,
      sheenRoughness: 0.7,
      envMapIntensity: 0.35,
    })
    const p = positionGeometry
    const u = p.x.mul(2200)
    const v = p.y.add(p.z).mul(2200)
    const fade = u.fwidth().max(v.fwidth()).smoothstep(0.5, 2.5)
    const threads = mix(u.sin().mul(v.sin()).mul(0.5).add(0.5), float(0.5), fade)
    const variation = mx_noise_float(p.mul(28)).mul(0.025).add(0.975)
    this.colorNode = color(tint).mul(variation).mul(threads.mul(0.06).add(0.97))
    this.normalNode = heightNormal(threads.mul(0.00006))
  }
}
