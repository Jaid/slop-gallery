import type {Node} from 'three/webgpu'

import {float, vec3} from 'three/tsl'

/** Rutile needles along three lattice directions; `raw` stays derivative-free for vertex displacement. */
export function needles(point: Node<'vec3'>) {
  const axes = [vec3(0.58, 0.58, 0.58).normalize(), vec3(-0.82, 0.36, 0.44).normalize(), vec3(0.2, -0.85, 0.5).normalize()]
  let band: Node<'float'> = float(0)
  let raw: Node<'float'> = float(0)
  for (const axis of axes) {
    const phase = point.dot(axis).mul(150)
    const cosine = phase.cos().mul(0.5).add(0.5)
    const visibility = phase.fwidth().smoothstep(0.6, 3).oneMinus()
    band = band.add(cosine.mul(visibility))
    raw = raw.add(cosine)
  }
  return {
    band: band.div(3),
    raw: raw.div(3),
  }
}
