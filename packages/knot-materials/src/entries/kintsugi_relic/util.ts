import type {Node} from 'three/webgpu'

import {
  float,
  Fn,
  mx_noise_vec3,
  vec3,
} from 'three/tsl'

import {cellularBoundary} from '../../lib/cellularBoundary.ts'
import {knotFrame} from '../../lib/knotFrame.ts'

/**
 * Physical Kintsugi relief displacement:
 * Bulges the hand-laid urushi lacquer seams proud of the porcelain surface.
 */
export const kintsugiDisplacement = Fn(([tube]: [Node<'vec2'>]) => {
  const {position: p, normal} = knotFrame(tube)
  // Domain-warped fracture cleavage
  const warp = mx_noise_vec3(p.mul(3.2)).mul(0.14)
  const fractureDist = cellularBoundary(p.mul(2.5).add(warp).add(vec3(1.2, -2, 0.7)))
  const seamWidth = 0.038
  const seamMask = fractureDist.smoothstep(0.006, seamWidth).oneMinus()
  // Semicircular meniscus bead profile
  const normalizedDist = fractureDist.div(seamWidth).clamp()
  const bead = float(1).sub(normalizedDist.pow(2)).max(0).sqrt()
  // Physical relief: builds up lacquer bead 0.014 units proud of the porcelain
  const relief = bead.mul(seamMask).mul(0.014)
  return p.add(normal.mul(relief))
})
