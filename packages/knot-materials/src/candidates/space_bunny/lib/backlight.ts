import type {Node} from 'three/webgpu'

import {positionViewDirection, vec3} from 'three/tsl'

/**
 * The gallery key light, expressed in view space: it sits high, to the left and behind the piece, so
 * every material in the exhibition shares one wrap direction no matter where the visitor stands.
 */
export const keyDirection = vec3(-0.34, 0.6, -0.72).normalize()
/**
 * Frostbite's cheap subsurface wrap: light that entered the far side of a thin solid, bent around the
 * interior and left toward the eye. Without a light rig reference this stays in view space, so the
 * glow always reads as lit from behind the visitor instead of following the sun.
 */
export function backlight(normal: Node<'vec3'>, power: Node<'float'> | number = 3.2, distortion = 0.45) {
  const bent = keyDirection.add(normal.mul(distortion)).normalize()
  return positionViewDirection.dot(bent.negate()).clamp().pow(power)
}
