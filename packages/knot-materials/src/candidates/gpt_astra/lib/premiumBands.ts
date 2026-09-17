import type {Node} from 'three/webgpu'

export function premiumBands(phase: Node<'float'>) {
  const resolved = phase.fwidth().smoothstep(0.55, 2.8).oneMinus()
  return phase.cos().mul(resolved).mul(0.5).add(0.5)
}
