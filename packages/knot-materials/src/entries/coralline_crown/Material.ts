import type {Texture} from 'three/webgpu'

import {color, mix, negateOnBackSide, positionView, positionViewDirection, transformNormalToView, uv, varying, vec2} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import knotData from './data.ts'
import {crownFields, reliefPosition} from './util.ts'

export default class CorallineCrownMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    const tube = uv()
    const {crown, bowl, breath} = crownFields(tube)
    this.positionNode = reliefPosition(tube)
    // Sample neighboring surface points in the vertex stage, then interpolate the true displaced normal.
    const epsilon = 0.0001
    const du = reliefPosition(tube.add(vec2(epsilon, 0))).sub(reliefPosition(tube.sub(vec2(epsilon, 0))))
    const dv = reliefPosition(tube.add(vec2(0, epsilon))).sub(reliefPosition(tube.sub(vec2(0, epsilon))))
    const normal = varying(transformNormalToView(du.cross(dv).normalize())).normalize()
    this.normalNode = negateOnBackSide(normal)
    this.clearcoatNormalNode = this.normalNode
    const facing = normal.dot(positionViewDirection).abs().clamp()
    const near = positionView.length().smoothstep(1, 5).oneMinus()
    this.colorNode = mix(mix(color('#103e43'), color('#ad572a'), crown.smoothstep(0.08, 0.8)), color('#f5d39a'), crown.pow(4))
    this.metalness = 0.85
    this.roughnessNode = crown.mul(-0.24).add(0.4)
    this.clearcoat = 0.25
    this.clearcoatRoughness = 0.12
    this.iridescenceNode = facing.oneMinus().mul(0.65)
    this.iridescenceThicknessNode = crown.mul(260).add(180)
    this.emissiveNode = mix(color('#08bda6'), color('#a4eaff'), facing).mul(bowl).mul(near.mul(0.7).add(0.08)).mul(breath)
  }
}
