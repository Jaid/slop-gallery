import {color, float, max, mix, mx_noise_float, mx_worley_noise_float, positionGeometry} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

import {heightNormal, visibleDetail} from './filters.ts'

/**
 * Worn, waxed aniline leather for the Lodge’s upholstery.
 *
 * A pebbled grain and soft creases are mapped in the mesh’s own frame, so they travel with rotated furniture. Wax gathers in the hollows, while the high spots are rubbed lighter and glossier. The grain flattens before it could shimmer.
 */
export default class LeatherMaterial extends MeshPhysicalNodeMaterial {
  constructor({tint = '#6a3a1e', highlight = '#9a6136'}: {
    highlight?: string
    tint?: string
  } = {}) {
    super({
      roughness: 0.5,
      envMapIntensity: 0.35,
    })
    const p = positionGeometry
    const footprint = max(p.x.fwidth(), p.y.fwidth()).max(p.z.fwidth())
    const pebbles = mx_worley_noise_float(p.mul(260)).mul(visibleDetail(footprint, 0.008))
    const creases = mx_noise_float(p.mul(9)).abs().smoothstep(0, 0.08).oneMinus().mul(visibleDetail(footprint, 0.02))
    const rub = mx_noise_float(p.mul(1.3)).mul(0.5).add(0.5)
    const mottle = mx_noise_float(p.mul(14)).mul(0.5).add(0.5)
    const base = mix(color(tint), color(highlight), rub.smoothstep(0.3, 0.9).mul(0.25).add(mottle.mul(0.06)))
    this.colorNode = base.mul(pebbles.mul(0.12).add(0.94)).mul(creases.mul(-0.22).add(1))
    this.roughnessNode = float(0.58).sub(rub.mul(0.18)).add(pebbles.mul(0.08)).add(creases.mul(0.1))
    this.clearcoatNode = rub.mul(0.25)
    this.clearcoatRoughnessNode = float(0.45)
    this.sheenNode = color(highlight).mul(0.25)
    this.sheenRoughnessNode = float(0.45)
    this.normalNode = heightNormal(pebbles.mul(0.00025).sub(creases.mul(0.0006)))
  }
}
