import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, mx_noise_vec3, normalLocal, vec3} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {crackField} from './lib/crack.ts'

export default class Material extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.7)
    this.name = knotData.id
// ---------------------------------------------------------------
// Kintsugi: a celadon-glazed porcelain knot, broken and rejoined
// with molten gold. The fracture network is a real three-dimensional
// Voronoi wall set, warped by noise so the shards are irregular, and
// the seams keep their depth as you walk around: look straight into a
// seam and the gold is there, glance across it and you only see the
// porcelain lip. Two march samples are enough to read the depth, and
// they keep the shader affordable.
// ---------------------------------------------------------------
    const {p, view, grazing, near, intimate} = viewerFrame()
    const scale = 4.5
    const width = 0.13
    const depth = 0.5
// Warping the lookup once, from the surface point, keeps every march sample on the same shard.
    const base = p.add(mx_noise_vec3(p.mul(3.5)).mul(0.06))
    const surface = crackField(base, scale)
    const crack = surface.smoothstep(0, width).oneMinus()
// March a short way along the line of sight; gold survives only where the ray stays inside the seam.
    let gold: Node<'float'> = float(1)
    const steps = 2
    for (let i = 0;i < steps;i++) {
      const t = (i + 0.5) / steps * depth
      gold = gold.mul(crackField(base.sub(view.mul(t / scale)), scale).smoothstep(0, width).oneMinus())
    }
// A cheap zero crossing of a fine noise field gives the glaze its web of crazing up close.
    const crazing = mx_noise_float(p.mul(scale * 3.2).add(vec3(3.1, 7.7, 1.3)))
    const hairline = crazing.abs().smoothstep(0, 0.05).oneMinus().mul(near)
    const relief = crack.mul(0.006).add(hairline.mul(0.0006))
    this.positionNode = p.sub(normalLocal.mul(relief))
    const porcelainNoise = mx_noise_float(p.mul(5.5)).mul(0.5).add(0.5)
    const porcelain = mix(color('#a8c4b0'), color('#5f8a72'), porcelainNoise.mul(0.9))
    const goldColor = mix(color('#d99a1e'), color('#ffe680'), gold.mul(0.4).add(0.4))
    this.colorNode = mix(porcelain, goldColor, gold)
    this.metalnessNode = gold
    this.roughnessNode = mix(float(0.26).add(mx_noise_float(p.mul(31)).mul(0.05)), float(0.025), gold)
    this.clearcoat = 1
    this.clearcoatRoughnessNode = mix(float(0.1), float(0.012), gold)
    const reliefNormal = proceduralNormal(relief, 1.8)
    this.normalNode = reliefNormal
    this.clearcoatNormalNode = reliefNormal
// The glaze pools and darkens inside the fracture, so the gold reads as recessed.
    this.aoNode = crack.mul(gold.oneMinus()).mul(0.5).oneMinus()
    this.emissiveNode = color('#ff8c1a').mul(gold).mul(intimate.mul(0.55).add(0.04)).mul(0.5)
      .add(color('#ffe9c8').mul(grazing.pow(3)).mul(0.05))
  }
}
