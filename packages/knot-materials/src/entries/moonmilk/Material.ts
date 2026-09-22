import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalViewGeometry, time, uv, vec2, vec3} from 'three/tsl'

import {tubeRay} from '../../lib/atelier.ts'
import {glints} from '../../lib/glints.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {spectralColor} from '../../lib/spectralColor.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {tablets} from './lib/tablets.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.8)
    this.name = knotData.id
// The inner shell of a giant pearl oyster: aragonite tablets mortared in conchiolin, each tablet a thin-film
// lens. Circling the knot sweeps the interference tide across every plate in turn; stepping closer reveals
// the growth striations on the tablets and the older, deeper plates beneath the mortar.
    const {p, facing, grazing, near, intimate} = viewerFrame()
    const tube = uv()
    const slope = tubeRay()
    const top = tablets(tube, vec2(420, 48), 0)
    const deep = tablets(tube.sub(slope.mul(0.012)), vec2(420, 48), 37)
    const tide = time.mul(0.09)
// Interference is driven mostly by the continuous view term so color flows across tablets instead of
// freezing one hue per cell; the per-tablet jitter only stirs the tide.
    const flow = mx_noise_float(p.mul(3).add(tide)).mul(TAU)
    const topPhase = facing.mul(6.5).add(grazing.mul(2)).add(flow).add(p.z.mul(3)).add(p.x.mul(2)).add(top.random.y.mul(1.2))
    const topFilm = spectralColor(topPhase)
    const deepFilm = spectralColor(topPhase.add(2.2).add(grazing.mul(3)))
    const pearl = color('#e8dfd0')
    const topTablet = pearl.mul(top.random.x.mul(0.08).add(0.96)).mul(topFilm.mul(0.9).add(0.1))
    const deepTablet = color('#b8a48c').mul(deep.random.x.mul(0.12).add(0.94)).mul(deepFilm.mul(0.85).add(0.15))
    const mortar = color('#4a3222').mul(top.random.z.mul(0.15).add(0.92))
    const gap = top.face.oneMinus()
    this.colorNode = mix(mix(mortar, deepTablet, deep.face.mul(0.65).add(0.35)), topTablet, top.face)
    this.metalness = 0
    this.roughnessNode = gap.mul(0.25).add(0.12).add(top.random.z.mul(0.02))
    this.clearcoat = 1
    this.clearcoatRoughness = 0.07
    this.iridescenceNode = top.face.mul(0.9).add(0.08)
    this.iridescenceIOR = 1.35
    this.iridescenceThicknessNode = float(120).add(top.random.x.mul(120)).add(facing.mul(240)).add(time.mul(7).sin().mul(18))
    this.aoNode = gap.mul(0.25).oneMinus()
    const relief = top.face.mul(0.05).add(top.striation.mul(intimate.mul(0.2))).add(gap.mul(-0.18)).add(deep.face.mul(gap).mul(0.06))
    this.normalNode = proceduralNormal(relief, 0.08).add(top.random.sub(0.5).mul(grazing.pow(2).mul(0.05))).normalize()
    const jitter = vec3(mx_noise_float(p.mul(30)), mx_noise_float(p.mul(30).add(9)), mx_noise_float(p.mul(30).add(17))).sub(0.5)
    const grainNormal = normalViewGeometry.add(jitter.mul(0.2)).normalize()
    const sparkle = glints(grainNormal, 140).mul(top.face).mul(near).mul(0.18)
    this.emissiveNode = color('#ffedd8').mul(grazing.pow(4).mul(0.04)).add(topFilm.mul(sparkle.mul(0.5)))
  }
}
