import type {Node} from 'three/webgpu'

import {cameraProjectionMatrix, float, modelScale, normalViewGeometry, positionView, positionViewDirection, screenSize, vec4} from 'three/tsl'

/**
 * Analytic size of one screen pixel on the surface, in object units — a derivative-free stand-in for
 * `fwidth()`.
 *
 * Hardware derivatives are only defined in uniform control flow. Three r186 emits divergent branches
 * whenever roughness varies per pixel (PMREM level selection), and with sheen or iridescence; on some
 * drivers every `fwidth()` in the shader then returns garbage along quads, which shows up as sparkling
 * seams and speckles. This estimate cannot break, is smooth instead of 2×2-blocky, and is shared by all
 * pattern filters in the exhibition.
 */
export function pixelFootprint() { // column 1 of the projection holds 1 / tan(fov / 2) in its y component
  const tanHalfFov = float(1).div(cameraProjectionMatrix.mul(vec4(0, 1, 0, 0)).y.abs().max(0.0001))
  const view = positionView.length().mul(tanHalfFov).mul(2).div(screenSize.y)
  const object = view.div(modelScale.x.max(0.0001))
  const facing = normalViewGeometry.normalize().dot(positionViewDirection).abs().max(0.12)
  return {/** footprint across the view direction, ignoring surface tilt */
    isotropic: object,
/** footprint along the direction the surface recedes, where the pixel is stretched the most */
    stretched: object.div(facing),
/** geometric mean, a balanced choice for 2D patterns */
    balanced: object.div(facing.sqrt()),
  }
}
/** Coverage of a signed distance (negative inside), both in object units, antialiased by `footprint`. */
export function coverage(distance: Node<'float'>, footprint: Node<'float'>) {
  const half = footprint.mul(0.5).max(0.000001)
  return distance.smoothstep(half, half.negate())
}
/** 1 while a pattern with the given period (object units) is resolved, fading to 0 once it drops below `pixels` pixels. */
export function resolved(period: Node<'float'> | number, footprint: Node<'float'>, pixels = 2) {
  const cycles = (typeof period === 'number' ? float(period) : period).div(footprint)
  return cycles.smoothstep(pixels * 0.5, pixels)
}
