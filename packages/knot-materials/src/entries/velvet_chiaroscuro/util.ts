import type {Node} from 'three/webgpu'

export function resolvedCosine(phase: Node<'float'>) {
  const visibility = phase.fwidth().smoothstep(0.65, 2.8).oneMinus()
  return phase.cos().mul(visibility)
}
