import type {Node} from 'three/webgpu'

export function visibility(footprint: Node<'float'>, start = 0.3, end = 1.1) {
  return footprint.smoothstep(start, end).oneMinus()
}
