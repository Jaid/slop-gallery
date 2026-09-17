import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, negateOnBackSide, transformNormalToView, uv, varying, vec2, vec3} from 'three/tsl'

import {bumpNormal} from '../../candidates/gpt_astra/lib/bumpNormal.ts'
import {line} from '../../candidates/gpt_astra/lib/line.ts'
import {viewerFrame} from '../../candidates/gpt_astra/lib/viewerFrame.ts'
import {visibility} from '../../candidates/gpt_astra/lib/visibility.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import knotData from './data.ts'
import {foldedPosition, foldFields} from './util.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.95)
    this.name = knotData.id
    // ---------------------------------------------------------------
    // A continuous sheet of folded, vermilion-printed rag paper.
    // The silhouette really pleats. Different slopes carry different
    // pigments, so circling the piece alternately conceals and reveals
    // the red facets without an artificial view-dependent hue shift.
    // ---------------------------------------------------------------
    const tube = uv()
    const {U, V, pleat} = foldFields(tube)
    this.positionNode = foldedPosition(tube)
    const e = 0.0002
    const du = foldedPosition(tube.add(vec2(e, 0)))
      .sub(foldedPosition(tube.sub(vec2(e, 0))))
    const dv = foldedPosition(tube.add(vec2(0, e)))
      .sub(foldedPosition(tube.sub(vec2(0, e))))
    const foldedNormal = varying(transformNormalToView(du.cross(dv).normalize())).normalize()
    const {p, near} = viewerFrame(foldedNormal)
    const fibreQ = p.mul(vec3(160, 32, 160))
    const fibreVisibility = visibility(fibreQ.fwidth().length()).mul(near)
    const fibres = mx_noise_float(fibreQ)
      .add(mx_noise_float(p.mul(vec3(32, 240, 32)))
        .mul(0.3))
      .mul(fibreVisibility)
    const inkFacet = U.cos().smoothstep(0.15, 0.65)
      .mul(V.cos().smoothstep(-0.5, 0.6))
    const score = line(U.cos(), 0.015)
    const valley = pleat.mul(-0.5).add(0.5)
    const paper = color('#efe7d3')
      .mul(fibres.mul(0.025).add(0.97))
    const ink = color('#bd3024')
      .mul(fibres.mul(0.045).add(0.96))
    this.colorNode = mix(paper, ink, inkFacet)
      .mul(score.mul(-0.1).add(1))
    this.metalness = 0
    this.ior = 1.46
    this.specularIntensity = 0.22
    this.roughnessNode = float(0.88)
      .sub(inkFacet.mul(0.22))
      .add(fibres.mul(0.018))
      .clamp(0.55, 0.95)
    this.normalNode = negateOnBackSide(bumpNormal(fibres.mul(0.00008), foldedNormal))
    this.aoNode = valley.pow(3).mul(-0.28).add(1)
  }
}
