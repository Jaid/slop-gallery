import type {Node} from 'three/webgpu'

/** Unresolved periodic bands settle to their mean instead of aliasing at shallow angles. */
export function opticalBands(phase: Node<'float'>) {
  const visibility = phase.fwidth().smoothstep(0.6, 3).oneMinus()
  return phase.cos().mul(visibility).mul(0.5).add(0.5)
}
