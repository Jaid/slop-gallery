import type {Texture} from 'three/webgpu'

import {color, float, mix, negateOnBackSide, positionView, positionViewDirection, time, transformNormalToView, uv, varying, vec2} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {spectralColor, terraceFields, terracePosition} from '../../flashHelpers.ts'
import knotData from './data.ts'

export default class BismuthZigguratMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const tube = uv()
    const fields = terraceFields(tube)
    const epsilon = 0.0001
    const du = terracePosition(tube.add(vec2(epsilon, 0))).sub(terracePosition(tube.sub(vec2(epsilon, 0))))
    const dv = terracePosition(tube.add(vec2(0, epsilon))).sub(terracePosition(tube.sub(vec2(0, epsilon))))
    const normal = varying(transformNormalToView(du.cross(dv).normalize())).normalize()
    this.positionNode = terracePosition(tube)
    this.normalNode = negateOnBackSide(normal)
    this.clearcoatNormalNode = this.normalNode
    const facing = normal.dot(positionViewDirection).abs().clamp()
    const near = positionView.length().smoothstep(1, 5).oneMinus()
    const hue = fields.stair.mul(3.4).add(fields.rnd.z.mul(5)).add(facing.mul(2.2)).add(time.mul(0.04))
    const oxide = spectralColor(hue).mul(0.62).add(0.3)
    const inCrystal = fields.border.oneMinus()
    const crystalColor = mix(color('#181225'), oxide.mul(fields.edge.oneMinus().mul(0.25).add(0.75)), inCrystal)
    this.colorNode = crystalColor
    this.metalness = 0.88
    this.roughnessNode = float(0.2).mix(0.55, fields.border)
    this.clearcoat = 0.4
    this.clearcoatRoughness = 0.15
    this.iridescence = 0.3
    this.iridescenceThicknessNode = facing.mul(300).add(150)
    this.emissiveNode = oxide.mul(fields.edge).mul(0.35).mul(near.mul(0.6).add(0.4))
      .add(color('#ffffff').mul(fields.edge).mul(facing.pow(3)).mul(0.5))
      .add(spectralColor(hue.add(2)).mul(inCrystal).mul(near.oneMinus()).mul(0.12))
  }
}
