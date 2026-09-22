import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_fractal_noise_float, mx_noise_float, normalLocal, positionGeometry, uv, vec3} from 'three/tsl'

import {glints} from '../../lib/glints.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {thread} from './lib/thread.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.55)
    this.name = knotData.id
// Wine-dark silk velvet with a single gold cord couched across the nap. The pile swallows front light and
// lets it out only at the folds, so walking around the knot reads the drape in slow crimson blooms; the gold,
// held down by tiny silk stitches, keeps its own private sunset however you turn.
    const {p, grazing, near, intimate} = viewerFrame()
    const tube = uv()
    const pile = mx_fractal_noise_float(p.mul(48), 2, 2, 0.5)
    const nap = mx_noise_float(p.mul(260).add(7)).mul(0.5).add(0.5)
    const fold = mx_fractal_noise_float(p.mul(2.2).add(3), 3, 2, 0.5)
    const cord = thread(tube.add(0.5))
    const pileHeight = pile.mul(0.04).add(nap.mul(intimate).mul(0.12)).add(cord.body.mul(1.2)).sub(cord.dent.mul(0.55))
    this.positionNode = positionGeometry.add(normalLocal.mul(pileHeight.mul(0.005)))
    this.normalNode = proceduralNormal(pileHeight, 0.12).add(normalLocal.mul(pile.mul(0.01))).normalize()
    const wine = color('#120105')
    const crest = color('#3d0715')
    const body = mix(wine, crest, fold.mul(0.7).add(pile.mul(0.08)))
    const gold = mix(color('#c08414'), color('#ffe9a0'), cord.luster)
    this.colorNode = mix(body, gold, cord.body.clamp(0, 1))
    this.metalnessNode = cord.body.mul(0.55)
    this.roughnessNode = float(0.92).add(nap.mul(0.06)).sub(cord.body.mul(0.6))
    this.sheenNode = color('#9c1638').mul(cord.body.oneMinus().clamp())
    this.sheenRoughness = 0.5
    this.retroreflectivityNode = cord.body.oneMinus().clamp().mul(0.9)
    this.anisotropyNode = cord.along.mul(cord.body.mul(0.85))
    this.clearcoat = 0
    this.envMapIntensity = 0.55
    this.aoNode = cord.dent.mul(0.4).oneMinus()
    const jitter = vec3(mx_noise_float(p.mul(210)), mx_noise_float(p.mul(210).add(9)), mx_noise_float(p.mul(210).add(17))).sub(0.5)
    const napGlint = glints(normalLocal.add(jitter.mul(0.1)), 90).mul(near).mul(0.08)
    const cordGlint = glints(normalLocal, cord.luster.mul(110).add(60)).mul(cord.body).mul(2)
    this.emissiveNode = color('#1a0208').mul(grazing.pow(3).mul(0.16)).add(gold.mul(cord.body).mul(0.5)).add(gold.mul(cordGlint.mul(0.9))).add(color('#ff6a88').mul(napGlint))
  }
}
