import type {Node} from 'three/webgpu'

export function wrap01(x: Node<'float'>) {
  return x.fract().sub(0.5).abs().oneMinus()
}
