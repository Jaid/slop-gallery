import type {Node, Texture} from 'three/webgpu'

import {color, cos, float, mix, sin, time, vec3} from 'three/tsl'

import {fbm} from '../../candidates/space_bunny/lib/fbm.ts'
import {ridgeBand} from '../../candidates/space_bunny/lib/ridgeBand.ts'
import {proceduralNormal} from '../../candidates/space_bunny/lib/surfaceGradient.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** Feather barbs. A vane is thousands of parallel barbs raked off a central rachis and locked together by hooklets, so the surface has a direction it can only be read along. The barbs separate under light and shadow exactly the way they do on a real feather: the whole vane splits into two unequal light halves. */
function vane(q: Node<'vec3'>, clock: Node<'float'>, barbs = 320) { // A draught moves through the vane, so the barbs lift and resettle instead of sitting still.
  const draught = fbm(q.mul(2.4).add(vec3(clock.mul(0.13), 0, clock.mul(0.05))), 3)
  const along = q.y.mul(barbs).add(fbm(q.mul(9).add(vec3(0, clock.mul(0.05), 0)), 2).mul(9)).add(draught.mul(7))
  const barbLine = ridgeBand(along.fract().sub(0.5), 0, 0.34)
  const hooklets = ridgeBand(q.x.mul(barbs * 0.55).add(draught.mul(6)), 0, 0.3)
  return {
    along,
    draught,
    drift: cos(along).mul(0.5).add(0.5),
    barb: barbLine,
    hooklet: hooklets.mul(0.7).add(0.3),
  }
}
/** The rachis runs the length of the vane, tapering as it goes. A nightjar's vane is asymmetric: a broad outer half and a narrow inner one, which is why the highlight splits into two unequal wings. */
function rachis(q: Node<'vec3'>, clock: Node<'float'>) {
  const centre = q.x.mul(7).add(fbm(q.mul(1.1), 2).mul(0.3)).add(sin(clock.mul(0.11)).mul(0.05))
  return {
    shaft: ridgeBand(centre, 0, 0.06),
    groove: ridgeBand(centre, 0, 0.018),
  }
}
/** Mottled camo: the barring that breaks the bird's outline against bark and stone. */
function barring(q: Node<'vec3'>, clock: Node<'float'>) {
  const field = fbm(q.mul(7.5).add(vec3(0, clock.mul(0.02), 0)), 4)
  return {
    field,
    bars: ridgeBand(field.fract().sub(0.5), 0, 0.3).mul(0.6).add(ridgeBand(field.fract().sub(0.5), 0, 0.1).mul(0.4)),
    mottle: fbm(q.mul(16), 3),
  }
}

/** A nightjar's vane. Keratin barbs raked off a rachis and locked with hooklets: the surface can only be read along the feather, and the highlight splits into two unequal wings as you turn. The barring exists to break the outline, so the plumage keeps rearranging itself as the light moves across it. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.7)
    this.name = knotData.id
    const {p, grazing, near, intimate} = viewerFrame()
    const {barb, hooklet, drift, draught} = vane(p, time, 320)
    const {shaft, groove} = rachis(p, time)
    const {bars, mottle} = barring(p, time)
// The barb rakes are what catch the studio: they brighten along the feather and vanish across it.
    const raked = barb.mul(hooklet).add(0.15)
// Nightjar plumage: bark-brown, silver-grey and buff, with the barring running across the vane.
    const dark = mix(color('#0a0806'), color('#2a2018'), mottle.mul(0.5).add(0.5))
    const silver = mix(color('#6f6a5e'), color('#cfc6b2'), drift.mul(0.5).add(0.5))
    const buff = mix(color('#3a2c1c'), color('#8a6c40'), mottle.mul(0.5).add(0.5))
    const barred = mix(dark, silver, bars.mul(0.9))
    const ground = mix(barred, buff, mottle.smoothstep(0.05, 0.28).mul(0.55))
    const quill = mix(color('#2a2018'), color('#c2b08a'), groove.mul(0.4).add(0.5))
    this.colorNode = mix(ground, quill, shaft.mul(0.9)).mul(raked.mul(0.65).add(0.42))
    this.metalness = 0
    this.roughnessNode = float(0.72).sub(raked.mul(0.48)).add(shaft.mul(-0.12))
    this.sheen = 0.9
    this.sheenColor.set('#f0e4c8')
    this.sheenRoughness = 0.38
    this.clearcoat = 0.25
    this.clearcoatRoughnessNode = float(0.25).add(grazing.mul(0.1))
    const relief = barb.mul(-0.6).add(hooklet.mul(0.2)).add(shaft.mul(0.5)).add(fbm(p.mul(200), 2).mul(0.12).mul(near))
    this.normalNode = proceduralNormal(relief, 0.0009)
// Keratin has a faint structural sheen that only shows where the barbs face the light head-on.
    this.emissiveNode = color('#d8c49a').mul(raked).mul(grazing.mul(0.55).add(0.15)).mul(0.55)
      .add(color('#fff4dc').mul(shaft).mul(intimate.mul(0.35).add(0.3)).mul(0.55))
      .add(color('#140f0a').mul(bars.oneMinus()).mul(intimate.mul(0.2).add(0.1)))
      .add(color('#c8b48c').mul(draught.smoothstep(0.1, 0.3)).mul(barb).mul(0.12))
  }
}
