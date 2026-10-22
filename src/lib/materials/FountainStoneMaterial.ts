import type {Node} from 'three/webgpu'

import {abs, float, length, max, mix, mx_noise_float, normalGeometry, positionGeometry, smoothstep} from 'three/tsl'

import fountain from '../gallery/fountain/config.ts'
import {heightNormal, visibleDetail} from './filters.ts'
import LimestoneMaterial from './LimestoneMaterial.ts'

const below = (value: Node<'float'>, edge: number, softness = 0.003) => float(1).sub(smoothstep(edge - softness, edge + softness, value))

/** The fountain’s limestone, a little darker and glossier wherever it is under water. */
export default class FountainStoneMaterial extends LimestoneMaterial {
  constructor() {
    super()
    const {basinInnerApothem, pools, spills} = fountain
    const p = positionGeometry
    const radius = length(p.xz)
    // Distance to the axis measured like an octagon’s apothem, for the basin’s flat inner walls.
    const x = abs(p.x)
    const z = abs(p.z)
    const octagon = max(max(x, z), x.add(z).mul(Math.SQRT1_2))
    // A bowl’s inside faces up, its dry underside faces down; the stem rising through a pool is wet all around.
    const inside = smoothstep(-0.1, 0.2, normalGeometry.y).max(below(radius, 0.22, 0.01))
    const wet = max(
      max(
        below(p.y, pools.cup).mul(below(radius, spills.cup.radius + 0.01)),
        below(p.y, pools.tazza).mul(below(radius, spills.tazza.radius + 0.01)),
      ).mul(inside),
      below(p.y, pools.basin).mul(below(octagon, basinInnerApothem + 0.005)),
    )
    // LimestoneMaterial assigns both nodes as floats and colors.
    this.colorNode = (this.colorNode as Node<'color'>).mul(mix(float(1.06), float(0.86), wet))
    this.roughnessNode = mix(float(0.5), float(0.28), wet)
    const grain = mx_noise_float(p.mul(95)).mul(visibleDetail(p.fwidth().length(), 1 / 95))
    this.normalNode = heightNormal(grain.mul(0.00006))
  }
}
