import type {Texture} from 'three/webgpu'

import {color, mix, mx_fractal_noise_float, mx_noise_float, time, uv, vec2} from 'three/tsl'

import {cellularPoints} from '../../lib/cellularPoints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** Silk velvet with the pile crushed both ways, dusted with the gold of an old loom. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.4)
    this.name = knotData.id
    const {p, grazing, near, intimate} = viewerFrame()
    const tube = uv()
// The pile: velvet lies one colour with the nap and another against it, and the lay drifts for ever.
    const lay = mx_fractal_noise_float(p.mul(2.4), 3, 2.1, 0.5)
      .add(mx_fractal_noise_float(p.mul(6.1), 2, 2.2, 0.5).mul(0.35))
      .add(time.mul(0.011).sin().mul(0.04))
    const withNap = lay.smoothstep(-0.55, 0.5)
    const pile = mix(color('#1e030b'), color('#580716'), withNap)
// Crushed streaks: pile bent flat, so it takes the light and gives it straight back.
    const crushField = mx_noise_float(vec2(tube.x.mul(150), tube.y.mul(11)))
    const crushed = crushField.abs().smoothstep(0.5, 0.1).mul(near.mul(0.35).add(0.65))
// Gold: the dust an old loom leaves behind, caught in the nap.
    const fleck = cellularPoints(p.mul(52).add(4.4), 0.02, 0.075, 0.83).mul(near.mul(0.5).add(0.5))
    const thread = fleck.mul(0.85)
// Velvet keeps its pile upright: the surface itself stays smooth, and all the relief is a normal map.
    this.colorNode = mix(pile, color('#e0b45c'), thread)
    this.metalnessNode = thread
    this.roughnessNode = thread.mul(0.24).sub(crushed.mul(0.1)).add(0.86).clamp(0.3, 0.96)
    const fibre = mx_noise_float(p.mul(680)).mul(0.5).add(0.5).mul(intimate.mul(0.3))
    this.normalNode = proceduralNormal(thread.mul(0.35).add(fibre.mul(0.16)), 0.14)
    this.sheenNode = mix(color('#c42a48'), color('#ff8a6e'), withNap)
    this.sheenRoughnessNode = crushed.mul(0.15).add(0.72)
    this.emissiveNode = mix(color('#e8304a'), color('#ff6a4e'), withNap).mul(grazing.pow(2.6)).mul(0.14)
      .add(color('#ffb070').mul(thread).mul(grazing.pow(2.2)).mul(near.mul(0.3).add(0.2)).mul(0.1))
      .add(color('#ffd2a8').mul(crushed).mul(grazing.pow(3)).mul(0.05))
  }
}
