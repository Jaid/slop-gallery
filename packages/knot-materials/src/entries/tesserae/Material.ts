import type {Node, Texture} from 'three/webgpu'

import {abs, color, dot, float, max, mix, mx_noise_float, normalLocal, positionGeometry, sin, time, uv, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** Opus tessellatum: glass cubes laid one by one into a gold ground, each a few degrees off true. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.7)
    this.name = knotData.id
    const {p, view, grazing, near, intimate} = viewerFrame()
    const tube = uv()
// The tesserae are cut square on the roll, so the grid is numbered to keep them square in world units.
    const columns = 176
    const rows = 20
    const grid = vec2(tube.x.mul(columns), tube.y.mul(rows))
    const cell = grid.floor()
    const identity = cellNoiseVec3(vec2(cell.x.mul(0.73), cell.y.mul(1.91)).add(3.1))
    const offset = identity.sub(0.5).mul(0.14)
    const local = grid.sub(cell).sub(offset)
    const reach = float(0.5).sub(max(abs(local.x), abs(local.y)))
// The icon: a lattice of lozenges, read once per cube so no tile ever mixes two colours.
    const sample = cell.add(0.5).add(offset).div(vec2(columns, rows))
    const field = sin(sample.x.mul(96.3).add(sample.y.mul(12.7))).mul(sin(sample.y.mul(61.1).sub(sample.x.mul(9.3))))
      .add(sin(sample.x.mul(57.7).sub(sample.y.mul(43.1)).add(sample.y.mul(28.9))).mul(0.62))
      .add(sin(sample.x.mul(31.3).add(sample.y.mul(77.3)).add(1.1)).mul(0.4))
    const band = field.mul(1.5).add(1.9)
// Four glasses from the same kiln, chosen per cube so the lozenges read as a design, not a shuffle.
    const choice = cellNoiseVec3(vec2(cell.x.mul(1.71), cell.y.mul(0.83)).add(5.1))
    const bias = choice.add(band.mul(0.1)).clamp(0, 1)
    const pick = (value: Node<'float'>) => value.sub(0.5).smoothstep(0.04, 0.015)
    const lapis = color('#1b3f9e')
    const emerald = color('#0d7a52')
    const crimson = color('#8e1f33')
    const ivory = color('#e6d8bc')
    const warp2 = pick(bias.y)
    const weft2 = pick(bias.x)
    const smalti = mix(mix(lapis, emerald, warp2), mix(crimson, ivory, warp2), weft2)
// An icon only resolves for the worshipper: a second register appears from one side of the room.
    const revealed = dot(view, vec3(0.42, 0.34, 0.84).normalize()).smoothstep(0.42, 0.95)
    const hiddenGlass = mix(mix(color('#3a1a5e'), color('#0e6a5e'), warp2), mix(color('#c9862a'), color('#e8c9b0'), warp2), weft2)
    const glass = mix(smalti, hiddenGlass, revealed.mul(0.7))
    const gold = color('#c8a044')
    const goldMask = band.fract().smoothstep(0.05, 0.13).oneMinus()
    const tileColour = mix(glass.mul(bias.z.mul(0.5).add(0.78)), gold.mul(choice.z.mul(0.24).add(0.88)), goldMask)
// Each tessera is set by hand: a few degrees of tilt, a chamfered rim, a face standing slightly proud.
    const tiltAxis = identity.xy.sub(0.5).normalize()
    const tilt = dot(local.xy, tiltAxis).mul(identity.y.mul(0.5).add(0.25))
    const face = reach.smoothstep(0.01, 0.055)
    const tile = reach.smoothstep(0.0015, 0.008)
    const proud = face.mul(0.72).add(tilt.mul(tile).mul(0.55))
// Gold leaf showing through the joints, laid over its bed of lime.
    this.positionNode = positionGeometry.add(normalLocal.mul(proud.mul(knotData.displacement)))
    const bed = mix(color('#120f0a'), color('#2b2417'), mx_noise_float(p.mul(180)).mul(0.5).add(0.5))
    this.colorNode = mix(bed, tileColour, tile)
    this.metalnessNode = goldMask.mul(tile).mul(0.95)
    this.roughnessNode = mix(float(0.24).add(identity.y.mul(0.14)), tile.mul(0.08).add(0.05), goldMask)
    const surface = proceduralNormal(proud, 0.42)
    this.normalNode = surface
// Every cube is a little mirror, and a thousand mirrors never all flash at once.
    const sparkle = glints(surface, 110).mul(identity.x.mul(0.5).add(0.5)).mul(intimate)
    const flicker = sin(time.mul(2.3).add(identity.y.mul(6.3))).mul(0.5).add(0.5)
    this.emissiveNode = color('#ffe9b0').mul(sparkle).mul(tile).mul(0.35)
      .add(gold.mul(tile.oneMinus()).mul(flicker).mul(near.mul(0.3).add(0.1)).mul(0.05))
      .add(color('#bfe4ff').mul(revealed).mul(tile).mul(grazing.pow(3)).mul(0.05))
  }
}
