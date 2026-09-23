import type {Triple} from '../../../lib/Triple.ts'
import type {Node} from 'three/webgpu'

import {float, vec3} from 'three/tsl'

/** Studio light directions matching the warm softbox, cool strip and fill of the gallery environment. */
export const studioLamps: ReadonlyArray<Triple> = [[0.4, 0.85, 0.55], [-0.55, 0.35, 0.75], [0.05, -0.5, 0.86]]
/**
 * Cat's-eye luster: the half-vector match ignores the fiber axis, so the highlight collapses into a band
 * across the fibers that slides around the surface as the viewer moves.
 */
export function chatoyance(normal: Node<'vec3'>, view: Node<'vec3'>, fiber: Node<'vec3'>, lights: ReadonlyArray<Triple> = studioLamps, sharpness = 120) {
  const axis = fiber.normalize()
  const across = normal.sub(axis.mul(normal.dot(axis))).add(0.0001).normalize()
  let hot: Node<'float'> = float(0)
  let glow: Node<'float'> = float(0)
  for (const light of lights) {
    const half = vec3(...light).normalize().add(view).normalize()
    const aim = half.sub(axis.mul(half.dot(axis))).add(0.0001).normalize()
    const match = across.dot(aim).clamp()
    hot = hot.add(match.pow(sharpness))
    glow = glow.add(match.pow(sharpness * 0.08))
  }
  return {
    glow: glow.div(lights.length),
    hot: hot.div(lights.length),
  }
}
