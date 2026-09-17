import type {Node} from 'three/webgpu'

export function ridge(field: Node<'float'>, width: Node<'float'> | number) {
  return field.abs().div(field.fwidth().mul(1.5).add(width)).oneMinus().clamp()
}
