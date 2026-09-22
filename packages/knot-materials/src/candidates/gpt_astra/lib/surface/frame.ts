import type {Node} from 'three/webgpu'

import {bitangentView, normalViewGeometry, positionViewDirection, tangentView, vec3} from 'three/tsl'

import {viewerFrame} from '../../../../lib/viewerFrame.ts'

/**
 * Object-wide proximity avoids a visible detail ring moving across the sculpture.
 */
export function exhibitionFrame() {
  const frame = viewerFrame()
  return {
    ...frame,
    near: frame.objectDistance.smoothstep(1.5, 4.8).oneMinus(),
    intimate: frame.objectDistance.smoothstep(1.2, 3.25).oneMinus(),
    tangent: tangentView.normalize(),
    bitangent: vec3(bitangentView as unknown as Node<'vec3'>).normalize(),
    normal: normalViewGeometry.normalize(),
    V: positionViewDirection,
  }
}
