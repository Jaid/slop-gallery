import type {Node} from 'three/webgpu'

import {bitangentView, cameraViewMatrix, float, normalViewGeometry, positionViewDirection, tangentView, time, vec3} from 'three/tsl'

/** Closed two-second motions make both the angle loop and the sixteen-second film seamless. */
export const breath = time.mul(Math.PI)

export function tangentViewFrame() {
  const T = tangentView.normalize()
  const B = vec3(bitangentView as unknown as Node<'vec3'>).normalize()
  const V = positionViewDirection
  return {
    T,
    B,
    V,
    N: normalViewGeometry,
    along: V.dot(T),
    across: V.dot(B),
  }
}

/** Fixed world-space lamps, not highlights painted onto the camera. */
const lamps = [vec3(-3, 9, -16), vec3(-0.238, -0.637, -0.733), vec3(0.59, -0.309, 0.554), vec3(-0.278, -0.287, 0.591)]
export function facetGlints(normal: Node<'vec3'>, sharpness = 100) {
  let sum: Node<'float'> = float(0)
  for (const direction of lamps) {
    const halfSum = direction.normalize().transformDirection(cameraViewMatrix).add(positionViewDirection)
    const half = halfSum.div(halfSum.length().max(0.00001))
    const alignment = normal.dot(half).clamp()
    // Broaden the lobe under minification and preserve its integrated energy.
    const footprint = alignment.fwidth().mul(sharpness).add(1)
    sum = sum.add(alignment.pow(float(sharpness).div(footprint)).div(footprint))
  }
  return sum
}
