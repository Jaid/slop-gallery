import type {Node} from 'three/webgpu'

import {cameraPosition, Fn, modelWorldMatrixInverse, time, vec4} from 'three/tsl'

import {knotFrame} from '../../lib/knotFrame.ts'
import knotData from './data.ts'

export function crownFields(tube: Node<'vec2'>) {
  const u = tube.x.mul(Math.PI * 24).add(tube.y.mul(Math.PI * 8).sin().mul(0.35))
  const v = tube.y.mul(Math.PI * 8)
  const radius = u.mul(0.5).sin().abs().pow(2).add(v.mul(0.5).sin().abs().pow(2)).max(0.00001).sqrt()
  return {
    crown: radius.sub(0.48).abs().pow(2).mul(-26).exp(),
    bowl: radius.pow(2).mul(-18).exp(),
    breath: time.mul(0.55).add(u.mul(0.25)).sin().mul(0.075).add(0.925),
  }
}

export const reliefPosition = Fn(([
  tube,
]: [
  Node<'vec2'>,
]) => {
  const {position: p, normal} = knotFrame(tube)
  const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
  const proximity = cameraLocal.sub(p).length().smoothstep(1, 5).oneMinus()
  const {crown, bowl, breath} = crownFields(tube)
  const height = crown.mul(knotData.displacement).mul(breath).sub(bowl.mul(0.04)).mul(proximity.mul(0.28).add(0.72))
  return p.add(normal.mul(height))
})
