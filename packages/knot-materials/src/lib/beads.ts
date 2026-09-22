import type {Node} from 'three/webgpu'

import {cellNoiseVec3} from './cellNoiseVec3.ts'

/** Sparse spherical beads on a jittered cell lattice. `core` stays free of derivatives for vertex use. */
export function beads(position: Node<'vec3'>, seed: Node<'float'> | number = 0) {
  const cell = position.floor()
  const random = cellNoiseVec3(cell.add(seed))
  const centre = random.mul(0.5).add(0.25)
  const dist = position.fract().sub(centre).length()
  const footprint = position.fwidth().length().max(0.001)
  const radius = random.z.mul(0.11).add(0.09)
  const core = dist.div(radius).smoothstep(0.85, 1).oneMinus()
  const gate = random.y.smoothstep(0.3, 0.42)
  const mask = dist.smoothstep(radius.add(footprint.mul(1.2)), radius.sub(footprint.mul(1.2)).max(0)).oneMinus().mul(gate)
  const cap = dist.div(radius).pow2().oneMinus().max(0).sqrt()
  return {
    cap,
    core: core.mul(gate),
    mask,
    radius,
    random,
  }
}
