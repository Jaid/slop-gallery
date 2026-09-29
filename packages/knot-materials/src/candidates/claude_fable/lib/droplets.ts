import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'

import {cellNoiseVec3} from './cellNoiseVec3.ts'
import {wrapCell} from './wrapCell.ts'

/**
 * Sparse droplets on a 2D lattice: one bead per cell, randomly placed, sized and gated.
 * `period` wraps cell identities so the lattice is seamless on a closed surface; use integers for both axes.
 * `cap` is the height of the bead's spherical cap above the surface (1 at the center, 0 at the rim).
 */
export function droplets(lattice: Node<'vec2'>, period: Node<'vec2'>, seed: number, keep = 0.6) {
  const cell = wrapCell(lattice.floor(), period)
  const random = cellNoiseVec3(vec3(cell, seed))
  const random2 = cellNoiseVec3(vec3(cell, seed + 17.3))
  const radius = random.z.mul(0.12).add(0.1)
  const center = random.xy.mul(0.5).add(0.25)
  const distance = lattice.fract().sub(center).length()
  const footprint = lattice.fwidth().length().max(0.0005)
  const edge = distance.smoothstep(radius.sub(footprint), radius.add(footprint.mul(0.3))).oneMinus()
  const gate = random2.x.smoothstep(1 - keep, 1 - keep + 0.05)
  const visibility = footprint.smoothstep(0.15, 0.6).oneMinus()
  const cap = distance.div(radius).clamp().pow2().oneMinus().sqrt()
  return {
    cap,
    mask: edge.mul(gate).mul(visibility),
    radius,
    random,
    random2,
  }
}
