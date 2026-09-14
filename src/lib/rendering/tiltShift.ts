import type {Node} from 'three/webgpu'

import {float, mix, screenUV, smoothstep} from 'three/tsl'

const focusHalfHeight = float(1 / 6)
const fullBlurDistance = float(1 / 3)

/** Composites an existing blur into the upper and lower thirds for zoom tilt-shift. */
export default function tiltShift(textureNode: Node<'vec4'>, blurredNode: Node<'vec4'>, zoomAmount: Node<'float'>) {
  const distanceFromCenter = screenUV.y.sub(0.5).abs()
  const band = smoothstep(focusHalfHeight, fullBlurDistance, distanceFromCenter)
  return mix(textureNode, blurredNode, band.mul(zoomAmount))
}
