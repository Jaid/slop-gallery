import type {Node} from 'three/webgpu'

export function line(field: Node<'float'>, width: number) {
  return field.abs()
    .smoothstep(width, field.fwidth().max(0.00001).add(width))
    .oneMinus()
}
