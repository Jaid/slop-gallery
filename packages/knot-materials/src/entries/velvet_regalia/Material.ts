import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_atan2, mx_fractal_noise_float, mx_noise_float, normalLocal, positionGeometry, uv, vec2, vec3} from 'three/tsl'

import {glints} from '../../lib/glints.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/**
 * A couched gold cord winding across the nap: signed distance to its path plus the couching stitches.
 */
function thread(tile: Node<'vec2'>) {
  const wander = tile.x.mul(2.3).sin().mul(0.34).add(tile.x.mul(0.7).cos().mul(0.14))
  const slope = tile.x.mul(2.3).cos().mul(0.78).sub(tile.x.mul(0.7).sin().mul(0.098))
  const cord = tile.y.sub(0.5).add(wander)
  const across = cord.abs().div(0.17)
  const body = across.smoothstep(0.7, 1.05).oneMinus()
  const ply = cord.mul(24).add(tile.x.mul(70)).sin().mul(0.5).add(0.5)
  const twist = mx_atan2(cord.mul(11), tile.x.mul(24).sin().add(0.000001)) as unknown as Node<'float'>
  const stitch = tile.x.mul(20).fract().sub(0.5).abs().div(0.22).smoothstep(0.5, 1).oneMinus()
  return {
    along: vec2(1, slope.mul(0.6)).normalize(),
    body,
    couch: stitch.mul(body),
    dent: stitch.mul(body),
    luster: twist.cos().mul(0.5).add(0.5).mul(0.45).add(ply.mul(0.55)),
  }
}

/**
 * Wine-dark silk velvet with a single gold cord couched across the nap. The pile swallows front light and lets it out only at the folds, so walking around the knot reads the drape in slow crimson blooms; the gold, held down by tiny silk stitches, keeps its own private sunset however you turn.
 */
export default class extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.55)
    this.name = knotData.id
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
