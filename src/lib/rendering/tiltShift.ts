import type {Node} from 'three/webgpu'

import {gaussianBlur} from 'three/addons/tsl/display/GaussianBlurNode.js'
import {float, mix, screenUV, smoothstep} from 'three/tsl'

const focusHalfHeight = float(1 / 6)
const fullBlurDistance = float(1 / 3)

/** A true separable Gaussian blur composited into the upper and lower thirds. */
export default function tiltShift(textureNode: Node<'vec4'>, zoomAmount: Node<'float'>) {
  // Half-resolution separable convolution stays smooth while keeping the extra passes affordable.
  const blurPass = gaussianBlur(textureNode, zoomAmount.mul(1.5), 2, {resolutionScale: 0.5})
  const distanceFromCenter = screenUV.y.sub(0.5).abs()
  const band = smoothstep(focusHalfHeight, fullBlurDistance, distanceFromCenter)
  const amount = band.mul(zoomAmount)
  return {
    blurPass,
    node: mix(textureNode, blurPass, amount),
  }
}
