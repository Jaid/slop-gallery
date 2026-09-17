import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_fractal_noise_float, mx_noise_float, normalViewGeometry, uv} from 'three/tsl'

import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalLine} from '../../lib/opticalLine.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {goldFlakes} from './util.ts'

export default class MakieLacquerMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    // Urushi lacquer, black when faced and blood-red at the edges, with sprinkled gold flakes under the coat.
    // Every flake has its own tilt so glints ignite and die with each step; the flakes gather in drifts like
    // real maki-e, and a second gold thread wound around the knot only reveals itself at arm's length.
    const {p, view, grazing, rim, near, intimate} = viewerFrame()
    const tube = uv()
    const inner = p.sub(view.mul(0.012))
    const q = inner.mul(85)
    const dispersal = mx_fractal_noise_float(p.mul(2.6), 2, 2, 0.5).mul(0.5).add(0.5)
    const threshold = dispersal.mul(-0.7).add(0.85)
    const flakes = goldFlakes(q, threshold)
    const flakeMask = flakes.coverage
    const flakeTint = flakes.tint
    const flakeSparkle = flakes.sparkle
    const thread = opticalLine(tube.y.mul(3).add(tube.x.mul(36)).fract().sub(0.5), 0.045)
    const threadFine = opticalLine(tube.y.mul(-2).add(tube.x.mul(24)).add(0.5).fract().sub(0.5), 0.035).mul(intimate)
    const threadMask = thread.max(threadFine).clamp()
    const goldMask = flakeMask.max(threadMask).clamp()
    // Continuous gold threads must not inherit the surrounding cells' random flake tint.
    const threadTint = mix(color('#f5c451'), color('#ffe9a8'), 0.5)
    const lacquer = mix(color('#160204'), color('#7a1210'), grazing.pow(1.6).mul(0.85).add(mx_noise_float(p.mul(2)).mul(0.1)).clamp())
    this.colorNode = mix(mix(lacquer, flakeTint, flakeMask), threadTint, threadMask)
    this.metalnessNode = goldMask.mul(0.95)
    this.roughnessNode = float(0.34).mix(0.22, goldMask)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.035
    this.normalNode = proceduralNormal(goldMask.mul(0.5).add(mx_noise_float(p.mul(14)).mul(0.15)), 0.0009)
    this.emissiveNode = flakeSparkle.mul(1.4).mul(near.mul(0.6).add(0.5)).add(color('#ffd166').mul(thread.add(threadFine)).mul(glints(normalViewGeometry, 40)).mul(0.5)).add(color('#3a0a08').mul(rim).mul(0.15))
  }
}
