import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_cell_noise_float, mx_noise_float, uv, vec2, vec3} from 'three/tsl'

import {loopTurn} from '../../candidates/deepseek/lib/loopClock.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/**
 * Distance from a point to a line segment in the glyph's own square.
 */
const segmentDistance = (point: Node<'vec2'>, start: Node<'vec2'>, end: Node<'vec2'>) => {
  const span = end.sub(start)
  return point.sub(start).sub(span.mul(point.sub(start).dot(span).div(span.dot(span).max(1e-5)).clamp())).length()
}
/**
 * A codex page wound around the knot. Lines of runic script are ruled onto the parchment, with rule lines, initials and marginal borders in gold leaf. A nib of light travels the page forever: it writes the words just ahead of itself and lets them fade into the margin before it returns. The parchment lifts wherever a visitor stands close, so the text you can actually read is the text near you, and the ink quietly thins out once a stroke falls below a pixel.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.55)
    this.name = knotData.id
    const {grazing, distance, intimate, near} = viewerFrame()
    const page = uv()
    const row = page.y.mul(9)
    const column = page.x.mul(150)
    const rowIndex = row.floor()
    const glyphIndex = column.floor()
    const inRow = row.fract()
    const inColumn = column.fract()
    const box = vec2(inColumn.sub(0.5).mul(0.86).add(0.5), inRow.sub(0.5).mul(0.76).add(0.5))
    const glyphId = mx_cell_noise_float(vec3(glyphIndex, rowIndex, 1.7))
    const shape = (seed: number) => mx_cell_noise_float(vec3(glyphIndex.add(seed * 0.31), rowIndex.add(seed * 0.77), seed * 4.1 + 2.3))
    const branch = (seed: number) => {
      const hash = shape(seed)
      const attach = hash.mul(5.3).fract().mul(0.6).add(0.16)
      const side = hash.mul(11.7).fract().smoothstep(0.35, 0.65).mul(2).sub(1)
      const length = hash.mul(17.3).fract().mul(0.26).add(0.13)
      const start = vec2(float(0.5), float(0.5).add(attach.sub(0.5)).add(side.mul(length).mul(0.55)))
      const end = vec2(float(0.5).add(side.mul(length).mul(0.85)), float(0.5).add(attach.sub(0.5)).add(side.mul(length).mul(-0.55)))
      return segmentDistance(box, start, end)
    }
    const stroke = segmentDistance(box, vec2(0.5, 0.06), vec2(0.5, 0.94)).min(branch(1)).min(branch(2)).min(branch(3))
    const strokeWidth = float(0.032).add(glyphId.mul(0.01))
    const aa = stroke.fwidth().max(0.0009)
    const inkCoverage = stroke.sub(strokeWidth).smoothstep(aa.negate(), aa).oneMinus()
    const resolved = aa.smoothstep(strokeWidth.mul(0.85), strokeWidth.mul(2.8)).oneMinus()
    const ink = inkCoverage.mul(resolved.mul(0.75).add(0.25))
    const initial = mx_cell_noise_float(vec3(glyphIndex.mul(0.31), rowIndex, 7.3)).smoothstep(0.965, 0.98)
    const carpet = mx_cell_noise_float(vec3(glyphIndex.mul(0.13), 4.4, 9.1)).smoothstep(0.93, 0.955)
    const rule = inRow.sub(0.085).abs().smoothstep(0.005, 0.018).oneMinus()
    const margin = inRow.smoothstep(0.02, 0.05).mul(inRow.smoothstep(0.98, 0.95).oneMinus())
    const yarn = mx_noise_float(vec3(page.x.mul(620), page.y.mul(90), 0)).mul(0.5).add(0.5)
    const laid = mx_noise_float(vec3(page.x.mul(1500), page.y.mul(60), 3.3)).mul(0.5).add(0.5)
    const foxing = mx_noise_float(vec3(page.x.mul(9), page.y.mul(3.5), 1.1)).mul(0.5).add(0.5)
    const attention = distance.smoothstep(1, 3.1).oneMinus()
    const parchmentTone = mix(color('#5c4c32'), color('#a68d63'), yarn.mul(0.4).add(laid.mul(0.35)).add(0.25))
    const parchment = mix(parchmentTone, color('#4e3a1e'), foxing.smoothstep(0.62, 0.9).mul(0.45))
    const lit = mix(parchment, parchment.mul(1.5), attention.mul(0.6).add(0.4))
    const tail = loopTurn.sub(page.x).fract()
    const ahead = page.x.sub(loopTurn).fract()
    const quill = ahead.mul(ahead).mul(-3200).exp()
    const wet = tail.mul(tail).mul(-60).exp()
    const written = tail.smoothstep(0.9, 0.995).oneMinus()
    const inkTone = mix(color('#150f0b'), color('#75221a'), glyphId.smoothstep(0.72, 0.78)).mul(written)
    const goldLeaf = mix(color('#8a611f'), color('#e8bd6c'), mx_noise_float(vec3(page.x.mul(40), page.y.mul(18), 2.7)).mul(0.5).add(0.5))
    const body = mix(lit, inkTone, ink.mul(0.94))
    const carpetGold = carpet.mul(inkCoverage.oneMinus().mul(0.4).add(0.35))
    this.colorNode = mix(mix(mix(body, goldLeaf, initial.mul(0.9).add(carpetGold.mul(0.7)).min(1)), goldLeaf, rule.mul(margin).mul(0.45)), color('#4a3c26'), laid.mul(0.08))
    this.roughnessNode = mix(float(0.78), float(0.32), initial.mul(0.8).add(rule.mul(0.6)).min(1)).sub(ink.mul(0.04)).sub(intimate.mul(0.05)).clamp(0.18, 0.85)
    this.metalnessNode = initial.mul(0.85).add(rule.mul(margin).mul(0.45)).add(carpetGold.mul(0.6)).clamp()
    this.sheen = 0.1
    this.sheenColor.set('#cbb894')
    this.normalNode = proceduralNormal(inkCoverage.mul(0.05).add(initial.mul(0.05)).add(yarn.mul(0.02)).add(laid.mul(0.012)), 0.0005)
    this.emissiveNode = color('#ffdca0').mul(quill.mul(1.2))
      .add(color('#f7e6bd').mul(wet.mul(written)).mul(0.35))
      .add(color('#f2e2c0').mul(ink.mul(attention.pow(1.6))).mul(0.3))
      .add(color('#e6c68a').mul(initial.mul(attention.pow(1.2))).mul(0.34))
      .add(color('#9c7a42').mul(grazing.pow(3)).mul(0.06))
      .add(color('#3a2c1a').mul(near.mul(0.06)))
  }
}
