import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, time, uv, vec2, vec3} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {catPoseCount} from './lib/cats.ts'
import {constellation} from './lib/constellation.ts'

/**
 * A night chart wrapped once around the tube. Four cat poses share it, each a constellation of dots joined by short meridians. The chart is flat in UV so a pose stays a pose. Leaning in wakes the twinkle. Circling warms the ear turned toward you.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.15)
    this.name = knotData.id
    const {facing, grazing, near, intimate, view} = viewerFrame()
    const tube = uv()
    const columns = 2
    const rows = 2
    const chart = tube.mul(vec2(columns, rows))
    const cell = chart.floor()
    const local = chart.fract().sub(0.5).mul(vec2(1.15, 1.35))
    const variant = cell.x.add(cell.y.mul(columns)).mod(catPoseCount)
    const posed = Array.from({length: catPoseCount}, (_, index) => constellation(local, index))
    let nearest: Node<'float'> = float(2)
    let link: Node<'float'> = float(2)
    for (const [index, cat] of posed.entries()) {
      const chosen = variant.equal(index)
      nearest = chosen.select(cat.nearest, nearest)
      link = chosen.select(cat.link, link)
    }
    const footprint = local.fwidth().length().max(0.0012)
    const starRadius = footprint.mul(1.5).clamp(0.016, 0.03)
    const star = nearest.div(starRadius).smoothstep(1.04, 0.08)
    const core = nearest.div(starRadius.mul(0.32)).smoothstep(1, 0)
    const resolved = footprint.smoothstep(0.07, 0.014)
    const threadWidth = footprint.mul(0.7).clamp(0.004, 0.008)
    const thread = link.div(threadWidth).smoothstep(1, 0.18).mul(star.oneMinus()).mul(resolved.mul(0.55).add(0.45))
    const alive = link.fwidth().smoothstep(0.03, 0.006)
    const wake = time.mul(0.9).add(cell.x.mul(1.7)).add(cell.y.mul(2.3)).sin().mul(0.5).add(0.5)
    const pulse = wake.mul(intimate.mul(0.55).add(0.2)).add(0.62)
    const milky = tube.y.sub(0.5).abs().smoothstep(0.42, 0.04).mul(mx_noise_float(vec3(tube.x.mul(18), tube.y.mul(8), time.mul(0.03))).mul(0.3).add(0.7))
    const parallax = view.y.mul(0.5).add(0.5)
    const ink = mix(color('#03050c'), color('#120c1c'), milky.mul(0.45))
    const starColor = mix(color('#ffd4ae'), color('#d5e7ff'), parallax)
    const limb = mix(color('#a894ff'), color('#ffc6a4'), parallax)
    this.colorNode = ink
    this.roughnessNode = float(0.86).sub(star.mul(0.3))
    this.metalnessNode = star.mul(0.15)
    this.clearcoatNode = float(0.08).add(near.mul(0.06))
    this.clearcoatRoughness = 0.3
    this.emissiveNode = color('#3a4c7a').mul(milky).mul(0.06)
      .add(starColor.mul(star).mul(pulse).mul(resolved.mul(0.65).add(0.35)).mul(5.5))
      .add(color('#fff8ee').mul(core).mul(pulse).mul(3.2))
      .add(limb.mul(thread).mul(alive).mul(1.35))
      .add(color('#ffe6c4').mul(star).mul(wake).mul(intimate).mul(0.4))
      .add(color('#8ea4d8').mul(grazing.pow(4)).mul(0.08))
      .add(color('#000').mul(facing.mul(0)))
  }
}
