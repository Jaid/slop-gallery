import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'

/**
 * Linear radiance of glowing carbon and flame gas for a normalized temperature, 0 = cold (black) and 1 = hottest (pale yellow).
 *
 * Green and blue rise much later than red, like blackbody radiation between roughly 800 and 1400 K, so cooling parts redden and darken together instead of turning gray.
 */
export default function fireColor(heat: Node<'float'>) {
  const h = heat.clamp()
  return vec3(h.pow(1.2), h.pow(2.4).mul(0.64), h.pow(5).mul(0.28))
}
