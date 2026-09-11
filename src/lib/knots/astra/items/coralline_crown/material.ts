import type {Node, Texture} from 'three/webgpu'

import {cameraPosition, color, Fn, mix, modelWorldMatrixInverse, negateOnBackSide, positionView, positionViewDirection, time, transformNormalToView, uv, varying, vec2, vec3, vec4} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'

function crownFields(tube: Node<'vec2'>) {
  const u = tube.x.mul(Math.PI * 24).add(tube.y.mul(Math.PI * 8).sin().mul(0.35))
  const v = tube.y.mul(Math.PI * 8)
  const radius = u.mul(0.5).sin().abs().pow(2).add(v.mul(0.5).sin().abs().pow(2)).max(0.000_01).sqrt()
  return {
    crown: radius.sub(0.48).abs().pow(2).mul(-26).exp(),
    bowl: radius.pow(2).mul(-18).exp(),
    breath: time.mul(0.55).add(u.mul(0.25)).sin().mul(0.075).add(0.925),
  }
}
const knotCurve = Fn(([
  angle]: [
  Node<'float'>,
]) => {
  const phase = angle.mul(1.5)
  const radius = phase.cos().add(2).mul(0.225)
  return vec3(radius.mul(angle.cos()), radius.mul(angle.sin()), phase.sin().mul(0.225))
})
// The same parametric frame as TorusKnotGeometry(0.45, 0.13, ..., 2, 3).
const reliefPosition = Fn(([
  tube]: [
  Node<'vec2'>,
]) => {
  const angle = tube.x.mul(Math.PI * 4)
  const center = knotCurve(angle)
  const next = knotCurve(angle.add(0.01))
  const tangent = next.sub(center)
  const binormal = tangent.cross(next.add(center)).normalize()
  const frameNormal = binormal.cross(tangent).normalize()
  const around = tube.y.mul(Math.PI * 2)
  const normal = frameNormal.mul(around.cos().negate()).add(binormal.mul(around.sin()))
  const p = center.add(normal.mul(0.13))
  const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
  const proximity = cameraLocal.sub(p).length().smoothstep(1, 5).oneMinus()
  const {crown, bowl, breath} = crownFields(tube)
  const height = crown.mul(knotData.displacement).mul(breath).sub(bowl.mul(0.04)).mul(proximity.mul(0.28).add(0.72))
  return p.add(normal.mul(height))
})
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
