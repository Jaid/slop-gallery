import type {Node} from 'three/webgpu'

import {bitangentView, cameraPosition, modelWorldMatrixInverse, normalViewGeometry, positionGeometry, positionView, positionViewDirection, tangentView, vec2, vec3, vec4} from 'three/tsl'

import {TAU} from '../../../lib/TAU.ts'

export function viewerFrame(normal: Node<'vec3'> = normalViewGeometry) {
  const N = normal.normalize()
  const V = positionViewDirection
  const T = tangentView.normalize()
  const B = vec3(bitangentView as unknown as Node<'vec3'>).normalize()
  const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
  const view = cameraLocal.sub(positionGeometry).normalize()
  const facing = N.dot(V).abs().clamp()
  const distance = positionView.length()
  return {
    p: positionGeometry,
    N,
    V,
    T,
    B,
    view,
    facing,
    grazing: facing.oneMinus(),
    near: distance.smoothstep(1.1, 5.2).oneMinus(),
    intimate: distance.smoothstep(0.85, 2.65).oneMinus(),

        // Approximate metres-to-UV conversion for this particular knot.
        // The denominator is bounded so grazing parallax cannot explode.
    uvSlope: vec2(V.dot(T), V.dot(B))
      .div(vec2(7.2, TAU * 0.13))
      .div(facing.max(0.22)),
  }
}
