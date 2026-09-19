import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, negateOnBackSide, transformNormalToView, uv, varying} from 'three/tsl'

import {cellularPoints} from '../../lib/cellularPoints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {sugarPhase, sugarPosition, sugarSurfaceNormal} from './util.ts'

/** Pulled raspberry candy with a mint pinstripe and a finely sugared, fluted glaze. */
export default class SugarRibbonMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.8)
    this.name = knotData.id
    const tube = uv()
    const phase = sugarPhase(tube)
    const footprint = phase.fwidth().max(0.001)
    const resolved = footprint.smoothstep(0.5, 2.5).oneMinus()
    const raspberry = phase.sin().smoothstep(footprint.negate().add(0.05), footprint.add(0.15))
    const mint = phase.cos().smoothstep(footprint.negate().add(0.86), footprint.add(0.94))
    const {p, view, intimate} = viewerFrame()
    const frostQ = p.mul(170)
    const frostVisibility = frostQ.fwidth().length().smoothstep(0.3, 1.4).oneMinus().mul(intimate)
    const frost = mx_noise_float(frostQ).smoothstep(0.16, 0.62).mul(frostVisibility)
    const bubbleQ = p.sub(view.mul(0.012)).mul(65)
    const bubbleVisibility = bubbleQ.fwidth().length().smoothstep(0.3, 1.2).oneMinus().mul(intimate)
    const bubbles = cellularPoints(bubbleQ, 0.025, 0.15, 0.8).mul(bubbleVisibility)
    const cream = color('#fff1ce')
    const striped = mix(mix(cream, color('#ce174d'), raspberry), color('#239f91'), mint)
    this.colorNode = mix(mix(color('#ee9cac'), striped, resolved), cream, frost.mul(0.36).add(bubbles.mul(0.15)))
    this.positionNode = sugarPosition(tube)
    this.normalNode = negateOnBackSide(varying(transformNormalToView(sugarSurfaceNormal(tube))).normalize())
    this.metalness = 0
    this.roughnessNode = float(0.17).add(frost.mul(0.3)).add(bubbles.mul(0.06))
    this.ior = 1.47
    this.transmission = 0.12
    this.thickness = 0.065
    this.clearcoat = 1
    this.clearcoatRoughness = 0.095
    this.clearcoatNormalNode = this.normalNode
  }
}
