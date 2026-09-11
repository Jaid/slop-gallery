import type {Node, Texture} from 'three/webgpu'

import {color, mix, mx_rotate2d, time, uv, vec3} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {cellNoiseVec3, opticalLine, proceduralNormal, viewerFrame} from '../../helpers.ts'
import knotData from './data.ts'

export default class CelestialAstrolabeMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const tube = uv()
    const {view, near, intimate} = viewerFrame()
    const angle = view.x.mul(0.8).add(view.y.mul(0.6)).add(time.mul(0.03))
    const rot = (mx_rotate2d(tube.sub(0.5), angle) as unknown as Node<'vec2'>).add(0.5)
    const starCoord = vec3(rot.mul(28), 1)
    const starCell = cellNoiseVec3(starCoord)
    const starDist = starCoord.fract().sub(starCell.mul(0.6).add(0.2)).length()
    const star = starDist.smoothstep(0, 0.12).oneMinus().mul(starCell.x.smoothstep(0.82, 0.86))
    const constellationLines = opticalLine(rot.y.mul(14).add(rot.x.mul(28)).sin(), 0.025)
    const engraved = star.max(constellationLines.mul(0.35))
    const goldMask = engraved.mul(intimate.mul(0.5).add(0.5))
    const baseColor = mix(color('#081826'), color('#122b45'), rot.y.sin().mul(0.5).add(0.5))
    this.colorNode = mix(baseColor, color('#e6c27a'), goldMask)
    this.metalness = 0.35
    this.metalnessNode = goldMask.mul(0.65)
    this.roughness = 0.4
    this.clearcoat = 0.35
    this.clearcoatRoughness = 0.25
    this.normalNode = proceduralNormal(engraved.mul(0.5), 0.0011)
    this.emissiveNode = color('#fff2c4').mul(star).mul(near.mul(0.8).add(0.4)).add(color('#88aaff').mul(constellationLines).mul(0.25))
  }
}
