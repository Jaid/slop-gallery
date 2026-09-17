import type {Texture} from 'three/webgpu'

import {color, negateOnBackSide, normalViewGeometry, time, transformNormalToView, uv, varying, vec2} from 'three/tsl'

import {glints} from '../../lib/glints.ts'
import {hairline as opticalLine} from '../../lib/hairline.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {spectralColor} from '../../lib/spectralColor.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {hopperFields, hopperPosition} from './util.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    // Hopper-grown crystal terraces; the oxide rainbow re-tunes as the eye circles it.
    const tube = uv()
    this.positionNode = hopperPosition(tube)
    const epsilon = 0.0002
    const du = hopperPosition(tube.add(vec2(epsilon, 0))).sub(hopperPosition(tube.sub(vec2(epsilon, 0))))
    const dv = hopperPosition(tube.add(vec2(0, epsilon))).sub(hopperPosition(tube.sub(vec2(0, epsilon))))
    const normal = varying(transformNormalToView(du.cross(dv).normalize())).normalize()
    this.normalNode = negateOnBackSide(normal)
    this.clearcoatNormalNode = this.normalNode
    const {terrace, riser, inTerrace} = hopperFields(tube)
    const {view, grazing, near} = viewerFrame()
    const level = terrace.div(7)
    const hue = level.mul(1.2).add(view.x.mul(0.55)).add(view.z.mul(0.45)).add(time.mul(0.02))
    const oxide = spectralColor(hue)
    const lip = opticalLine(inTerrace.oneMinus(), 0.12)
    this.colorNode = oxide.mul(riser.mul(0.25).add(0.75)).mul(0.92)
    this.metalness = 0.9
    this.roughnessNode = riser.mul(0.14).add(0.12)
    this.clearcoat = 0.65
    this.clearcoatRoughness = 0.08
    this.iridescence = 0.5
    this.iridescenceIOR = 1.4
    this.iridescenceThicknessNode = level.mul(280).add(220)
    this.emissiveNode = spectralColor(hue.add(2.4)).mul(lip.mul(0.85).add(riser.pow(2).mul(0.12))).mul(near.mul(0.55).add(0.45)).add(oxide.mul(glints(normalViewGeometry, 130)).mul(near).mul(0.3)).add(color('#6a5bff').mul(grazing.pow(3)).mul(0.25))
  }
}
