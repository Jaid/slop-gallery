import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_fractal_noise_float, mx_noise_float, normalViewGeometry, uv, vec3} from 'three/tsl'
import {cellNoiseVec3 as mx_cell_noise_vec3} from '#src/lib/knots/cellNoise.ts'
import {opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'
import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'
import {viewerFrame, glints} from '../../helpers.ts'
export default class MakieLacquerMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    // Urushi lacquer, black when faced and blood-red at the edges, with sprinkled gold flakes under the coat.
    // Every flake has its own tilt so glints ignite and die with each step; the flakes gather in drifts like
    // real maki-e, and a second gold thread wound around the knot only reveals itself at arm's length.
    const { p, view, grazing, rim, near, intimate } = viewerFrame()
    const tube = uv()
    const inner = p.sub(view.mul(0.012))
    const q = inner.mul(85)
    const rnd = mx_cell_noise_vec3(q)
    const rnd2 = mx_cell_noise_vec3(q.add(vec3(37.1, 11.3, 59.7)))
    const dispersal = mx_fractal_noise_float(p.mul(2.6), 2, 2, 0.5).mul(0.5).add(0.5)
    const threshold = dispersal.mul(-0.7).add(0.85)
    const present = rnd.x.smoothstep(threshold, threshold.add(0.04))
    const dist = q.fract().sub(rnd2.mul(0.4).add(0.3)).length()
    const footprint = q.fwidth().length().max(0.001)
    const shape = dist.smoothstep(0.24, footprint.mul(0.8).add(0.3)).oneMinus()
    const flakeMask = present.mul(shape).mul(footprint.smoothstep(0.4, 1.6).oneMinus())
    const flakeNormal = normalViewGeometry.add(rnd2.mul(2).sub(1).mul(0.45)).normalize()
    const glint = glints(flakeNormal, 90)
    const flakeTint = mix(color('#f5c451'), color('#ffe9a8'), rnd.y)
    const thread = opticalLine(tube.y.mul(3).add(tube.x.mul(36)).fract().sub(0.5), 0.045)
    const threadFine = opticalLine(tube.y.mul(-2).add(tube.x.mul(24)).add(0.5).fract().sub(0.5), 0.035).mul(intimate)
    const goldMask = flakeMask.max(thread).max(threadFine).clamp()
    const lacquer = mix(color('#160204'), color('#7a1210'), grazing.pow(1.6).mul(0.85).add(mx_noise_float(p.mul(2)).mul(0.1)).clamp())
    this.colorNode = mix(lacquer, flakeTint, goldMask)
    this.metalnessNode = goldMask.mul(0.95)
    this.roughnessNode = float(0.34).mix(0.22, goldMask)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.035
    this.normalNode = proceduralNormal(goldMask.mul(0.5).add(mx_noise_float(p.mul(14)).mul(0.15)), 0.0009)
    this.emissiveNode = flakeTint.mul(glint).mul(flakeMask).mul(1.4).mul(near.mul(0.6).add(0.5)).add(color('#ffd166').mul(thread.add(threadFine)).mul(glints(normalViewGeometry, 40)).mul(0.5)).add(color('#3a0a08').mul(rim).mul(0.15))
  }
}
