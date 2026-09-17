import type {Node} from 'three/webgpu'

import {mx_noise_vec3, vec3} from 'three/tsl'

export /** A signed, warped network of intersecting mineral fracture planes. */
function glacierField(q: Node<'vec3'>) {
  const warp = mx_noise_vec3(q.mul(4.3)).mul(0.045)
  const s = q.add(warp)
  const a = s.dot(vec3(17, 9, -5)).add(0.4).sin().abs()
  const b = s.dot(vec3(-8, 21, 13)).add(1.7).sin().abs()
  const c = s.dot(vec3(11, -7, 24)).sub(0.8).sin().abs()
  return a.min(b).min(c)
}
